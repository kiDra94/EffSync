import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M16: subtasks only inside one's project (T41, UC-10, decision Q2),
// COMPLETED only at 100 % (T100), and notifications (T44, T72)
describe("Task rules (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacher: string; // Anna, creator of task 1 "Mathe Test"
  let member: string; // Felix, assigned to task 1
  let outsider: string; // Laura, not involved in task 1

  const login = async (identifier: string) =>
    (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier, password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  const send = (
    method: "post" | "patch",
    url: string,
    token: string,
    body: object,
  ) =>
    request(app.getHttpServer())
      [method](url)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    teacher = await login("alehrerin");
    member = await login("ffuchs");
    outsider = await login("lgruber");
  });

  afterAll(async () => {
    await app.close();
  });

  const subtask = { title: "Kapitel 5 üben", deadline: "2026-12-01" };

  it("lets a member of the project create a subtask, and answers 403 to an outsider", async () => {
    await send("post", "/api/tasks", outsider, {
      ...subtask,
      parent_task_id: 1,
    }).expect(403);
    await send("post", "/api/tasks/1/subtasks", outsider, subtask).expect(403);

    await send("post", "/api/tasks", member, {
      ...subtask,
      parent_task_id: 1,
    }).expect(201);
  });

  it("completes a task only at 100 %", async () => {
    const task = await prisma.tasks.findFirstOrThrow({
      where: { title: subtask.title },
    });

    await send("patch", `/api/tasks/${task.task_id}`, member, {
      status: "COMPLETED",
    }).expect(400);
    await send("patch", `/api/tasks/${task.task_id}`, member, {
      status: "COMPLETED",
      progress: 100,
    }).expect(200);
  });

  it("notifies a user added to a task", async () => {
    await send("post", "/api/tasks/1/members", teacher, { user_id: 5 }).expect(
      201,
    );

    expect(
      await prisma.notifications.findFirst({
        where: { user_id: 5, type: "task_member_added" },
      }),
    ).toMatchObject({
      text: 'Du wurdest zur Aufgabe "Mathe Test" hinzugefügt.',
    });
  });

  it("notifies the people involved about a status change, not the actor", async () => {
    await send("patch", "/api/tasks/1", teacher, {
      status: "IN_PROGRESS",
    }).expect(200);

    const notified = await prisma.notifications.findMany({
      where: { type: "task_status_changed", text: { contains: "Mathe Test" } },
      select: { user_id: true },
      orderBy: { user_id: "asc" },
    });
    // Felix (assignee, member) and Laura (member since the last test), not Anna
    expect(notified.map((n) => n.user_id)).toEqual([4, 5]);
  });
});
