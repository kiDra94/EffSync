import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash } from "node:crypto";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// Token model (GOALS.md M12, T51, T123, decision Q8b): a 15-minute access
// token, a 7-day refresh token that rotates, and logout per session.
interface Tokens {
  token: string;
  refreshToken: string;
}

describe("Sessions: access token, refresh, logout (e2e)", () => {
  let app: INestApplication<App>;
  // the session of the first test, kept to show that another logout leaves it alone
  let firstSession: Tokens;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
  });

  // three logins per app instance: the login throttle allows 3 per minute
  const login = async (): Promise<Tokens> => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: "alehrerin", password: "password123" })
      .expect(201);
    return response.body as Tokens;
  };
  const refresh = (refreshToken: string) =>
    request(app.getHttpServer())
      .post("/api/auth/refresh")
      .send({ refreshToken });
  const profile = (token: string) =>
    request(app.getHttpServer())
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);

  it("issues an access token valid 15 minutes and a refresh token on login", async () => {
    const tokens = await login();
    firstSession = tokens;

    expect(tokens.refreshToken).toEqual(expect.any(String));
    const jwt = app.get(JwtService);
    const claims = jwt.decode<{ iat: number; exp: number }>(tokens.token);
    expect(claims.exp - claims.iat).toBe(15 * 60);
  });

  it("login → refresh → logout, and the old tokens stop working", async () => {
    const first = await login();

    const refreshed = await refresh(first.refreshToken).expect(201);
    const rotated = refreshed.body as Tokens;
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    // T51: rotation keeps the login's expiry, the session ends 7 days after login
    const expiryOf = async (refreshToken: string) =>
      (
        await app.get(PrismaService).refresh_tokens.findUniqueOrThrow({
          where: {
            token_hash: createHash("sha256").update(refreshToken).digest("hex"),
          },
        })
      ).expires_at;
    expect(await expiryOf(rotated.refreshToken)).toEqual(
      await expiryOf(first.refreshToken),
    );
    await profile(rotated.token).expect(200);

    // a refresh token that was already rotated can't be used again
    await refresh(first.refreshToken).expect(401);

    const loggedOut = await request(app.getHttpServer())
      .post("/api/auth/logout")
      .send({ refreshToken: rotated.refreshToken })
      .expect(204);
    // THESIS: T13 – refresh and logout set no cookie either
    expect(refreshed.headers["set-cookie"]).toBeUndefined();
    expect(loggedOut.headers["set-cookie"]).toBeUndefined();
    // a revoked refresh token gets 401
    await refresh(rotated.refreshToken).expect(401);
  });

  it("logout on one session leaves another session working", async () => {
    const otherDevice = await login();

    await request(app.getHttpServer())
      .post("/api/auth/logout")
      .send({ refreshToken: otherDevice.refreshToken })
      .expect(204);
    await refresh(otherDevice.refreshToken).expect(401);

    // the first test's session is untouched
    const stillValid = (await refresh(firstSession.refreshToken).expect(201))
      .body as Tokens;
    await profile(stillValid.token).expect(200);
  });

  it("answers an expired access token with 401", async () => {
    const jwt = app.get(JwtService);
    const expired = jwt.sign(
      { sub: 2, username: "alehrerin", role: "teacher" },
      { expiresIn: -60 },
    );

    await profile(expired).expect(401);
  });

  it("answers an unknown refresh token with 401 and a missing one with 400", async () => {
    await refresh("not-a-real-token").expect(401);
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .send({})
      .expect(400);
  });
});
