import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { createTestApp } from "./setup/create-test-app";

// T62 (NFA-05, 06_…:213, decision Q4, GOALS.md M30): in production the app
// serves only HTTPS behind its reverse proxy; HTTP is redirected (308)
describe("HTTPS only in production (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // the HTTP setup reads NODE_ENV; the module itself keeps the test config
    const env = process.env.NODE_ENV;
    const publicUrl = process.env.PUBLIC_URL;
    process.env.NODE_ENV = "production";
    process.env.PUBLIC_URL = "https://effsync.example";
    try {
      app = await createTestApp(moduleFixture);
    } finally {
      process.env.NODE_ENV = env;
      if (publicUrl === undefined) delete process.env.PUBLIC_URL;
      else process.env.PUBLIC_URL = publicUrl;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("redirects a request that came in over http with 308", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/tasks?page=2")
      .set("Host", "evil.example")
      .set("X-Forwarded-Proto", "http")
      .expect(308);

    // review M30: to the configured address, not the client's Host header

    expect(res.headers.location).toBe(
      "https://effsync.example/api/tasks?page=2",
    );
  });

  it("serves a request that came in over https, with HSTS", async () => {
    const res = await request(app.getHttpServer())
      .get("/api")
      .set("X-Forwarded-Proto", "https")
      .expect(200);

    expect(res.headers["strict-transport-security"]).toContain("max-age=");
  });

  it("redirects a POST without losing its method (308, not 301)", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-Forwarded-Proto", "http")
      .send({ identifier: "x", password: "y" })
      .expect(308);
  });
});
