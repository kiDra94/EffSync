import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { createTestApp } from "./setup/create-test-app";

/**
 * GOALS.md M29 (T121, T123, 08_…:102, :112-138): the auth endpoints of the
 * thesis' table with their happy path and error paths. Combinations an
 * endpoint can't produce are listed with the reason (N/A).
 *
 * | Endpoint              | 2xx | 400 | 401 | 403 | 404 |
 * |-----------------------|-----|-----|-----|-----|-----|
 * | POST /api/auth/register | 201 | ✓ | N/A: public | N/A: public | N/A: no resource (409 for a taken name instead) |
 * | POST /api/auth/login    | 201 | N/A: the credentials guard answers missing fields with 401 | ✓ | N/A: public | N/A: an unknown user is a 401 (no account enumeration) |
 * | POST /api/auth/logout   | 204 | ✓ | N/A: public, the refresh token is the credential | N/A | N/A: an unknown token is idempotent (204) |
 */
describe("API: auth endpoints (e2e)", () => {
  let app: INestApplication<App>;
  const post = (url: string, body: object) =>
    request(app.getHttpServer()).post(url).send(body);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
  });

  // register and login allow 3 requests per minute and app instance: each
  // block uses exactly 3, so a further case belongs in another file; the
  // 409 case relies on the account the 201 case created
  describe("POST /api/auth/register", () => {
    const user = {
      firstname: "Rita",
      lastname: "Register",
      email: "rita.register@student.htl.at",
      username: "rregister",
      password: "geheim123",
    };

    it("201: creates the account without the password hash", async () => {
      const res = await post("/api/auth/register", user).expect(201);
      expect(res.body).not.toHaveProperty("password_hash");
    });

    it("400: refuses an invalid body", async () => {
      await post("/api/auth/register", { ...user, email: "kein-mail" }).expect(
        400,
      );
    });

    it("409: refuses a taken username or e-mail", async () => {
      await post("/api/auth/register", user).expect(409);
    });
  });

  describe("POST /api/auth/login and /logout", () => {
    let refreshToken: string;

    it("201: issues an access token and a refresh token", async () => {
      const res = await post("/api/auth/login", {
        identifier: "ffuchs",
        password: "password123",
      }).expect(201);
      const body = res.body as { token: string; refreshToken: string };
      expect(body.token).toEqual(expect.any(String));
      refreshToken = body.refreshToken;
    });

    it("401: refuses a wrong password and missing fields", async () => {
      await post("/api/auth/login", {
        identifier: "ffuchs",
        password: "falsch",
      }).expect(401);
      await post("/api/auth/login", { identifier: "ffuchs" }).expect(401);
    });

    it("204: ends the session, after which the refresh token is useless", async () => {
      await post("/api/auth/logout", { refreshToken }).expect(204);
      await post("/api/auth/refresh", { refreshToken }).expect(401);
      // idempotent for an unknown token
      await post("/api/auth/logout", { refreshToken: "unbekannt" }).expect(204);
    });

    it("400: refuses a logout without a refresh token", async () => {
      await post("/api/auth/logout", {}).expect(400);
    });
  });
});
