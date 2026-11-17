import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M15: comments and grading remarks (decision Q16), the logged task
// delete (decision Q8g) and the admin audit log (T33, decision A2)
describe("Task management (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let student: string; // Felix, assigned to task 3
  let teacher: string; // Anna
  let admin: string;

  // three logins per app instance: the login throttle allows 3 per minute
  const login = async (identifier: string) =>
    (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier, password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  const as = (token: string) => ({
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set("Authorization", `Bearer ${token}`),
    post: (url: string, body: object) =>
      request(app.getHttpServer())
        .post(url)
        .set("Authorization", `Bearer ${token}`)
        .send(body),
    patch: (url: string, body: object) =>
      request(app.getHttpServer())
        .patch(url)
        .set("Authorization", `Bearer ${token}`)
        .send(body),
    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(url)
        .set("Authorization", `Bearer ${token}`),
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    student = await login("ffuchs");
    teacher = await login("alehrerin");
    admin = await login("adminadmin");
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves the former discussion comments from `comments` after the seed", async () => {
    const comments = (
      await as(student).get("/api/tasks/1/comments").expect(200)
    ).body as { content: string; created_by: number }[];

    expect(comments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content:
            "Ich habe eine Frage: Sind auch Aufgaben aus Kapitel 4 dabei?",
          created_by: 4,
        }),
      ]),
    );
    // grading remarks are a table of their own now
    expect(await prisma.task_grade.count({ where: { task_id: 1 } })).toBe(0);
  });

  it("lets only teachers write grading remarks, and the task's members read them", async () => {
    await as(student)
      .post("/api/tasks/3/grade-remarks", { text: "Ich bewerte mich selbst" })
      .expect(403);
    await as(teacher)
      .post("/api/tasks/3/grade-remarks", { text: "Abgabe vollständig." })
      .expect(201);

    const remarks = (
      await as(student).get("/api/tasks/3/grade-remarks").expect(200)
    ).body as { text: string }[];
    expect(remarks.map((r) => r.text)).toEqual([
      "Felix, sehr gute Lösungen! Bitte achte beim nächsten Mal auf die Formatierung der Herleitung.",
      "Abgabe vollständig.",
    ]);
  });

  it("lets only the author change or delete a comment", async () => {
    const comment = (
      await as(student)
        .post("/api/tasks/1/comments", { content: "Danke für die Hilfe!" })
        .expect(201)
    ).body as { comment_id: number };

    await as(teacher)
      .delete(`/api/tasks/1/comments/${comment.comment_id}`)
      .expect(403);
    await as(student)
      .patch(`/api/tasks/1/comments/${comment.comment_id}`, {
        content: "Danke!",
      })
      .expect(200);
    await as(student)
      .delete(`/api/tasks/1/comments/${comment.comment_id}`)
      .expect(204);
  });

  // THESIS: T32 (M15, decision Q8g)
  it("logs a task delete and keeps the task's log rows", async () => {
    const task = (
      await as(teacher)
        .post("/api/tasks", { title: "E2E Löschtest", deadline: "2026-12-01" })
        .expect(201)
    ).body as { task_id: number };
    await as(teacher)
      .patch(`/api/tasks/${task.task_id}`, { title: "E2E Löschtest" })
      .expect(200);
    await as(teacher).delete(`/api/tasks/${task.task_id}`).expect(200);

    const rows = await prisma.task_activity_log.findMany({
      where: { action: { contains: "E2E Löschtest" } },
      orderBy: { log_id: "asc" },
    });
    expect(rows.map((r) => [r.action, r.task_id])).toEqual([
      ['Task created: "E2E Löschtest"', null],
      ['Task updated: "E2E Löschtest"', null],
      ['Task deleted: "E2E Löschtest"', null],
    ]);
  });

  // T33, UC-32, decision A2
  it("shows the audit log, deleted tasks included, to admins only", async () => {
    await as(student).get("/api/tasks/activity").expect(403);
    await as(teacher).get("/api/tasks/activity").expect(403);

    const audit = (
      await as(admin)
        .get("/api/tasks/activity?action=Löschtest&limit=10")
        .expect(200)
    ).body as {
      data: { action: string; task_id: number | null }[];
      meta: { total: number };
    };
    expect(audit.meta.total).toBe(3);
    expect(audit.data[0]).toMatchObject({
      action: 'Task deleted: "E2E Löschtest"',
      task_id: null,
    });
  });
});
