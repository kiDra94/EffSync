import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { AuthService } from "../src/modules/auth/auth.service";
import { createTestApp } from "./setup/create-test-app";

describe("AuthController Throttling (e2e)", () => {
  let app: INestApplication<App>;

  // register is mocked: this test is about the throttler, not about creating users
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

    app = await createTestApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
  });

  it("Sanity Check: should return 200 on GET /api", async () => {
    await request(app.getHttpServer()).get("/api").expect(200);
  });

  it("should allow 3 requests and block the 4th one", async () => {
    // a body that passes the production ValidationPipe (CreateUserDto)
    const dto = {
      email: "test@example.com",
      password: "secretpassword",
      firstname: "Test",
      lastname: "User",
      username: "throttle_user",
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(dto)
        .expect(201);
    }

    // the 4th request within the window is blocked by the throttler (HTTP 429)
    const response = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send(dto)
      .expect(429);

    expect((response.body as { message: string }).message).toMatch(
      /ThrottlerException/,
    );
  });
});
