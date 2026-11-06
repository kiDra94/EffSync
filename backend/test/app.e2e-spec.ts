import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";
import { createTestApp } from "./setup/create-test-app";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await createTestApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
  });

  // Swagger is registered at "api" before the routes, so it answers GET /api
  // and AppController's "Hello World!" (GET /api) is unreachable, in
  // production as well as here.
  it("/api (GET) serves the Swagger UI", async () => {
    const response = await request(app.getHttpServer()).get("/api").expect(200);

    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.text).toContain("swagger-ui");
  });

  it("/api-json (GET) serves the OpenAPI document", async () => {
    const response = await request(app.getHttpServer())
      .get("/api-json")
      .expect(200);

    expect((response.body as { info: { title: string } }).info.title).toBe(
      "EffSync API",
    );
  });

  it("serves routes only under the /api prefix, as in production", () => {
    return request(app.getHttpServer()).get("/").expect(404);
  });
});
