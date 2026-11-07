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

  // THESIS: T33 (M15, decisions Q6 and A2) – the activity log is /tasks/:id/activity and the
  // admin audit log /tasks/activity, in the guarded TaskController
  it("serves the activity log under /api/tasks, behind the JWT guard", async () => {
    await request(app.getHttpServer()).get("/api/tasks/activity").expect(401);
    await request(app.getHttpServer()).get("/api/tasks/1/activity").expect(401);
  });

  // decision Q6: the old task prefixes are removed
  it.each([
    ["get", "/api/task-activity"],
    ["get", "/api/task-templates"],
    ["get", "/api/task-comments"],
    ["get", "/api/api/tasks/1/members"],
    ["patch", "/api/task-activity/1"],
    ["delete", "/api/task-activity/1"],
  ] as const)("%s %s no longer exists", async (method, url) => {
    await request(app.getHttpServer())[method](url).expect(404);
  });

  // THESIS: T110 – the stub /templates is gone; templates are /tasks/templates (Q6)
  it("GET /api/templates no longer exists", async () => {
    await request(app.getHttpServer()).get("/api/templates").expect(404);
  });

  it("GET /api/tasks/templates is the guarded real API", async () => {
    await request(app.getHttpServer()).get("/api/tasks/templates").expect(401);
  });
});
