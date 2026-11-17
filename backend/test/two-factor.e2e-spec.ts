import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { authenticator } from "otplib";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M32 (T31, FA-06, UC-01b, decision Q8d): enable 2FA, sign in with
// the code, a wrong code is a 401, and the admin reset
describe("Two-factor authentication (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: number;
  let token: string;
  let secret: string;
  let challenge: string;

  const http = () => request(app.getHttpServer());
  const login = (identifier: string) =>
    http()
      .post("/api/auth/login")
      .send({ identifier, password: "password123" })
      .expect(201);
  // the code of the authenticator app, now or some steps of 30 s later
  const codeIn = (steps = 0) =>
    authenticator
      .clone({ epoch: Date.now() + steps * 30_000 })
      .generate(secret);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);

    userId = (
      await prisma.users.create({
        data: {
          firstname: "Tina",
          lastname: "Zwei",
          username: "tzwei",
          email: "tina.zwei@student.htl.at",
          password_hash: await bcrypt.hash("password123", 4),
          user_roles: { create: { role_id: 2 } },
        },
      })
    ).user_id;
    token = ((await login("tzwei")).body as { token: string }).token;
  });

  afterAll(async () => {
    await app.close();
  });

  const asUser = (method: "get" | "post", url: string, bearer = token) =>
    http()[method](url).set("Authorization", `Bearer ${bearer}`);

  it("enables 2FA with the QR code's secret and a first code", async () => {
    expect((await asUser("get", "/api/auth/2fa").expect(200)).body).toEqual({
      enabled: false,
    });

    const setup = (await asUser("post", "/api/auth/2fa/setup").expect(201))
      .body as { secret: string; otpauth_url: string; qr_code: string };
    secret = setup.secret;
    expect(setup.otpauth_url).toContain(`secret=${secret}`);
    expect(setup.qr_code).toMatch(/^data:image\/png;base64,/);

    // decision Q8d: the stored secret is encrypted, not the secret itself
    const row = await prisma.user_two_factor.findUniqueOrThrow({
      where: { user_id: userId },
    });
    expect(row.secret_encrypted).toMatch(/^v1:/);
    expect(row.secret_encrypted).not.toContain(secret);
    expect(row.enabled_at).toBeNull();

    await asUser("post", "/api/auth/2fa/enable")
      .send({ code: "000000" })
      .expect(400);
    await asUser("post", "/api/auth/2fa/enable")
      .send({ code: codeIn(0) })
      .expect(204);
    expect((await asUser("get", "/api/auth/2fa").expect(200)).body).toEqual({
      enabled: true,
    });
  });

  it("asks for the code after the password, and gives no tokens before (UC-01b)", async () => {
    const body = (await login("tzwei")).body as Record<string, unknown>;

    expect(Object.keys(body).sort()).toEqual([
      "challenge_token",
      "two_factor_required",
    ]);
    expect(body.two_factor_required).toBe(true);
    expect(typeof body.challenge_token).toBe("string");
    challenge = body.challenge_token as string;
    // the challenge is no access token
    await asUser("get", "/api/auth/profile", challenge).expect(401);
  });

  it("answers 401 for a wrong code and signs in with the right one", async () => {
    await http()
      .post("/api/auth/2fa/verify")
      .send({ challenge_token: challenge, code: "000000" })
      .expect(401);

    // the next step's code: the enable step used this one's (one use each)
    const signedIn = (
      await http()
        .post("/api/auth/2fa/verify")
        .send({ challenge_token: challenge, code: codeIn(1) })
        .expect(200)
    ).body as { token: string; refreshToken: string; user_id: number };
    expect(signedIn.user_id).toBe(userId);
    expect(signedIn.refreshToken).toEqual(expect.any(String));
    await asUser("get", "/api/auth/profile", signedIn.token).expect(200);
  });

  it("lets an admin reset it, and only an admin (decision Q8d)", async () => {
    // a student may not
    await http()
      .delete(`/api/users/${userId}/two-factor`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    const admin = ((await login("adminadmin")).body as { token: string }).token;
    await http()
      .delete(`/api/users/${userId}/two-factor`)
      .set("Authorization", `Bearer ${admin}`)
      .expect(204);

    expect(
      await prisma.user_two_factor.findUnique({ where: { user_id: userId } }),
    ).toBeNull();
    expect((await asUser("get", "/api/auth/2fa").expect(200)).body).toEqual({
      enabled: false,
    });
    // the open challenge is worthless now
    await http()
      .post("/api/auth/2fa/verify")
      .send({ challenge_token: challenge, code: codeIn(2) })
      .expect(401);

    // M14: deleting a user deletes the secret with them
    const other = await prisma.users.create({
      data: {
        firstname: "Otto",
        lastname: "Zwei",
        username: "ozwei",
        email: "otto.zwei@student.htl.at",
        password_hash: "x",
        user_roles: { create: { role_id: 2 } },
        user_two_factor: {
          create: { secret_encrypted: "v1:x:y:z", enabled_at: new Date() },
        },
      },
    });
    await http()
      .delete(`/api/users/${other.user_id}`)
      .set("Authorization", `Bearer ${admin}`)
      .expect(200);
    expect(
      await prisma.user_two_factor.findUnique({
        where: { user_id: other.user_id },
      }),
    ).toBeNull();
  });
});
