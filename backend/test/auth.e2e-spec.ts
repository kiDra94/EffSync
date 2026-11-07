import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { GoogleAuthGuard } from "../src/modules/auth/guards/google-auth.guard";
import { createTestApp } from "./setup/create-test-app";

// Login, OAuth redirect and CSRF-by-design (GOALS.md M9, T49, T116, Q9, T13).
// Seed user Felix: username "ffuchs", e-mail "felix@student.htl.at".
describe("Authentication (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // the real guard redirects to Google; here it hands over a Google user
      .overrideGuard(GoogleAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<{ user?: unknown }>();
          req.user = { userId: 4, username: "ffuchs", role: "student" };
          return true;
        },
      })
      .compile();
    app = await createTestApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (identifier: string) =>
    request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier, password: "password123" });

  // THESIS: T49, T116 – LocalAuthGuard accepts the username or the e-mail address
  it("logs in with the username", async () => {
    const response = await login("ffuchs").expect(201);
    expect((response.body as { token?: string }).token).toEqual(
      expect.any(String),
    );
  });

  it("logs in with the e-mail address, in any letter case", async () => {
    const response = await login("Felix@Student.HTL.at").expect(201);
    expect((response.body as { username: string }).username).toBe("ffuchs");
  });

  // THESIS: T13 – authentication uses only the bearer header, never a cookie
  it("sends no Set-Cookie on login", async () => {
    const response = await login("ffuchs").expect(201);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  // decision Q9: token in the URL fragment, no query parameters, no user object
  it("redirects the Google callback with the token in the fragment and no query", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/auth/google/callback")
      .expect(302);

    const location = new URL(response.headers.location);
    expect(location.pathname).toBe("/auth-callback");
    expect(location.search).toBe("");
    expect(location.hash).toMatch(/^#token=[\w-]+\.[\w-]+\.[\w-]+$/);
    // THESIS: T13
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  // THESIS: T13 – CORS is limited to FRONTEND_URL
  it("answers a preflight from a foreign origin without Access-Control-Allow-Origin", async () => {
    const response = await request(app.getHttpServer())
      .options("/api/auth/login")
      .set("Origin", "https://evil.example")
      .set("Access-Control-Request-Method", "POST");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows the preflight from FRONTEND_URL", async () => {
    const origin = process.env.FRONTEND_URL as string;
    const response = await request(app.getHttpServer())
      .options("/api/auth/login")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST");

    expect(response.headers["access-control-allow-origin"]).toBe(origin);
  });

  // the global ThrottlerGuard runs before LocalAuthGuard: 3 logins per minute (the
  // three above), so the fourth is refused before the credentials are checked
  it("throttles the fourth login within a minute", async () => {
    await login("ffuchs").expect(429);
  });
});
