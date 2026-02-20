import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { AuthService } from "../src/modules/auth/auth.service";

describe("AuthController Throttling (e2e)", () => {
  let app: INestApplication;

  // Wir mocken "register", da wir diese Route gleich testen
  const authServiceMock = {
    register: () => Promise.resolve({ id: 1, email: "test@example.com" }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("Sanity Check: should return 200 on GET /", async () => {
    await request(app.getHttpServer()).get("/").expect(200);
  });

  it("should allow 3 requests and block the 4th one", async () => {
    const dto = { email: "test@example.com", password: "secretpassword" };

    // WICHTIG: Hier rufen wir jetzt die ECHTE Route /auth/register auf!
    await request(app.getHttpServer())
      .post("/auth/register")
      .send(dto)
      .expect(201);
    await request(app.getHttpServer())
      .post("/auth/register")
      .send(dto)
      .expect(201);
    await request(app.getHttpServer())
      .post("/auth/register")
      .send(dto)
      .expect(201);

    // Der 4. Request sollte vom Throttler blockiert werden (HTTP 429)
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send(dto)
      .expect(429);

    expect(response.body.message).toMatch(/ThrottlerException/);
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => setTimeout(() => resolve(true), 500));
  });
});
