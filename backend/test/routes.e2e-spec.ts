import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { createTestApp } from "./setup/create-test-app";

// The scaffold modules `templates` and `task-activity` (GOALS.md M5) answered
// with placeholder strings and shadowed the real task-activity-log API.
describe("Routes without scaffold stubs (e2e)", () => {
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

  // THESIS: T33 – /task-activity belongs to TaskActivityLogController, which requires a JWT
  it("GET /api/task-activity reaches the guarded activity-log controller", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/task-activity",
    );

    expect(response.status).toBe(401);
    expect(response.text).not.toContain("This action returns");
  });

  it("PATCH and DELETE /api/task-activity/:id are not served by a stub", async () => {
    await request(app.getHttpServer())
      .patch("/api/task-activity/1")
      .send({})
      .expect(404);
    await request(app.getHttpServer())
      .delete("/api/task-activity/1")
      .expect(404);
  });

  // THESIS: T110 – templates live at /task-templates; the stub /templates is gone
  it("GET /api/templates no longer exists", async () => {
    await request(app.getHttpServer()).get("/api/templates").expect(404);
  });

  it("GET /api/task-templates is the guarded real API", async () => {
    await request(app.getHttpServer()).get("/api/task-templates").expect(401);
  });
});
