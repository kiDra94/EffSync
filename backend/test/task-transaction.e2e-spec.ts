import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { ActivityLogRepository } from "../src/contexts/task-management/application/ports/activity-log.repository";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// THESIS: T32 (L1, GOALS.md M15) – a task change and its activity-log entry
// commit together: when the log write fails, the task change is rolled back
describe("One transaction per task use case (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ActivityLogRepository)
      .useValue({
        append: () => Promise.reject(new Error("activity log is down")),
        findForTask: () => Promise.resolve([]),
        findPage: () => Promise.resolve({ entries: [], total: 0 }),
        detachFromTask: () => Promise.resolve(),
      })
      .compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    token = (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "pschmidt", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rolls back a created task when its log entry can't be written", async () => {
    const before = await prisma.tasks.count();

    await request(app.getHttpServer())
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Darf es nicht geben", deadline: "2026-12-01" })
      .expect(500);

    expect(await prisma.tasks.count()).toBe(before);
    expect(
      await prisma.tasks.count({ where: { title: "Darf es nicht geben" } }),
    ).toBe(0);
  });

  it("rolls back an update when its log entry can't be written", async () => {
    const task = await prisma.tasks.create({
      data: { title: "Vorher", created_by: 3 },
    });

    await request(app.getHttpServer())
      .patch(`/api/tasks/${task.task_id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Nachher" })
      .expect(500);

    expect(
      (
        await prisma.tasks.findUniqueOrThrow({
          where: { task_id: task.task_id },
        })
      ).title,
    ).toBe("Vorher");
  });
});
