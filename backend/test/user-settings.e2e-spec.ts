import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M25 (T68, decision Q8f): the theme is stored per user, so a
// second session (another browser, another device) gets it back
describe("User settings (e2e)", () => {
  let app: INestApplication<App>;
  let firstSession: string;
  let secondSession: string;

  const login = async () =>
    (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "tthema", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  const settings = (token: string) =>
    request(app.getHttpServer())
      .get("/api/users/me/settings")
      .set("Authorization", `Bearer ${token}`);
  const save = (token: string, body: object) =>
    request(app.getHttpServer())
      .patch("/api/users/me/settings")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    await app.get(PrismaService).users.create({
      data: {
        firstname: "Theo",
        lastname: "Thema",
        username: "tthema",
        email: "theo.thema@student.htl.at",
        password_hash: await bcrypt.hash("password123", 4),
        user_roles: { create: { role_id: 2 } },
      },
    });
    firstSession = await login();
    secondSession = await login();
  });

  afterAll(async () => {
    await app.close();
  });

  it("starts with the light theme", async () => {
    expect((await settings(firstSession).expect(200)).body).toEqual({
      theme: "light",
    });
  });

  it("returns a theme set in one session to the user's other session", async () => {
    expect(
      (await save(firstSession, { theme: "dark" }).expect(200)).body,
    ).toEqual({
      theme: "dark",
    });

    expect((await settings(secondSession).expect(200)).body).toEqual({
      theme: "dark",
    });
  });

  it("takes light, dark and system only, and only for the signed-in user", async () => {
    await save(secondSession, { theme: "system" }).expect(200);
    await save(secondSession, { theme: "blue" }).expect(400);
    await save(secondSession, { theme: "dark", user_id: 1 }).expect(400);
    await request(app.getHttpServer())
      .get("/api/users/me/settings")
      .expect(401);
  });
});
