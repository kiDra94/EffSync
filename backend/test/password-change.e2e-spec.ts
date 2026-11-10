import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M27 (T47): the password change in the profile, with the current
// password; it ends the other sessions and keeps this one signed in
describe("Password change (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let refreshToken: string;

  const http = () => request(app.getHttpServer());
  const login = (password: string) =>
    http().post("/api/auth/login").send({ identifier: "pwechsel", password });
  const change = (body: object, bearer = token) =>
    http()
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${bearer}`)
      .send(body);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    await app.get(PrismaService).users.create({
      data: {
        firstname: "Paula",
        lastname: "Wechsel",
        username: "pwechsel",
        email: "paula.wechsel@student.htl.at",
        password_hash: await bcrypt.hash("altes-passwort", 4),
        user_roles: { create: { role_id: 2 } },
      },
    });
    const session = (await login("altes-passwort").expect(201)).body as {
      token: string;
      refreshToken: string;
    };
    token = session.token;
    refreshToken = session.refreshToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("refuses a wrong current password with 400", async () => {
    await change({
      current_password: "falsch",
      new_password: "neues-passwort",
    }).expect(400);
  });

  it("changes the password, ends the old sessions and keeps this one", async () => {
    const changed = (
      await change({
        current_password: "altes-passwort",
        new_password: "neues-passwort",
      }).expect(201)
    ).body as { token: string; refreshToken: string };

    await http()
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${changed.token}`)
      .expect(200);
    // the session from before the change is over
    await http().post("/api/auth/refresh").send({ refreshToken }).expect(401);
    await http()
      .post("/api/auth/refresh")
      .send({ refreshToken: changed.refreshToken })
      .expect(201);
    await login("altes-passwort").expect(401);
    await login("neues-passwort").expect(201);
  });

  it("checks the new password like the registration", async () => {
    await change({
      current_password: "neues-passwort",
      new_password: "kurz",
    }).expect(400);
  });

  // 3 attempts a minute, like the login: a stolen token can't guess on
  it("refuses a fourth attempt within the minute (429)", async () => {
    await change({
      current_password: "geraten",
      new_password: "neues-passwort",
    }).expect(429);
  });
});
