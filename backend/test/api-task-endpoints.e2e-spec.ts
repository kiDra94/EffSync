import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

/**
 * GOALS.md M29 (T121, T123, 08_…:102, :112-138): the task endpoints of the
 * thesis' table, each with its happy path and 400, 401, 403 and 404.
 *
 * | Endpoint                | 2xx | 400 | 401 | 403 | 404 |
 * |-------------------------|-----|-----|-----|-----|-----|
 * | POST /api/tasks         | 201 | ✓ | ✓ | ✓ | ✓ (parent) |
 * | GET /api/tasks          | 200 | ✓ | ✓ | ✓ | N/A: a list |
 * | GET /api/tasks/:id      | 200 | ✓ | ✓ | ✓ | ✓ |
 * | PATCH /api/tasks/:id    | 200 | ✓ | ✓ | ✓ | ✓ |
 * | DELETE /api/tasks/:id   | 200 | ✓ | ✓ | ✓ | ✓ |
 *
 * 403 comes from a user without any role (no permissions) and, for DELETE,
 * from a student deleting someone else's task (problem 5).
 */
describe("API: task endpoints (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacher: string; // user 2
  let student: string; // user 4
  let nobody: string; // no role, no permissions
  let taskId: number;

  const login = async (identifier: string) =>
    (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier, password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  const call = (
    method: "get" | "post" | "patch" | "delete",
    url: string,
    token?: string,
    body?: object,
  ) => {
    let req = request(app.getHttpServer())[method](url);
    if (token) req = req.set("Authorization", `Bearer ${token}`);
    return body ? req.send(body) : req;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    await prisma.users.create({
      data: {
        firstname: "Ohne",
        lastname: "Rolle",
        username: "ohnerolle",
        email: "ohne.rolle@htl.at",
        password_hash: await bcrypt.hash("password123", 4),
      },
    });
    teacher = await login("alehrerin");
    student = await login("ffuchs");
    nobody = await login("ohnerolle");
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/tasks", () => {
    it("201: creates a task for the requester", async () => {
      const res = await call("post", "/api/tasks", teacher, {
        title: "Matrix-Aufgabe",
        deadline: "2026-12-01",
        assigned_to: 4,
      }).expect(201);
      const created = res.body as { task_id: number; created_by: number };
      expect(created.created_by).toBe(2);
      taskId = created.task_id;
    });

    it("400: refuses a body without a title", async () => {
      await call("post", "/api/tasks", teacher, {
        deadline: "2026-12-01",
      }).expect(400);
    });

    it("401: refuses a request without a token", async () => {
      await call("post", "/api/tasks", undefined, { title: "x" }).expect(401);
    });

    it("403: refuses a user without create_tasks", async () => {
      await call("post", "/api/tasks", nobody, {
        title: "x",
        deadline: "2026-12-01",
      }).expect(403);
    });

    it("404: refuses a missing parent task", async () => {
      await call("post", "/api/tasks", teacher, {
        title: "x",
        deadline: "2026-12-01",
        parent_task_id: 999999,
      }).expect(404);
    });
  });

  describe("GET /api/tasks", () => {
    it("200: lists with filter, sort and paging", async () => {
      const res = await call(
        "get",
        "/api/tasks?status=TODO&sortBy=title&sortOrder=asc&page=1&limit=5",
        teacher,
      ).expect(200);
      const body = res.body as {
        data: { status: string }[];
        meta: { limit: number };
      };
      expect(body.meta.limit).toBe(5);
      expect(body.data.every((t) => t.status === "TODO")).toBe(true);
    });

    it("400: refuses an unknown status and a page below 1", async () => {
      await call("get", "/api/tasks?status=FERTIG", teacher).expect(400);
      await call("get", "/api/tasks?page=0", teacher).expect(400);
    });

    it("401 and 403: no token, no view_dashboard", async () => {
      await call("get", "/api/tasks").expect(401);
      await call("get", "/api/tasks", nobody).expect(403);
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("200: shows a visible task", async () => {
      await call("get", `/api/tasks/${taskId}`, student).expect(200);
    });

    it("400, 401, 403 and 404", async () => {
      await call("get", "/api/tasks/abc", teacher).expect(400);
      await call("get", `/api/tasks/${taskId}`).expect(401);
      await call("get", `/api/tasks/${taskId}`, nobody).expect(403);
      await call("get", "/api/tasks/999999", teacher).expect(404);
    });
  });

  describe("PATCH /api/tasks/:id", () => {
    it("200: changes a task", async () => {
      const res = await call("patch", `/api/tasks/${taskId}`, teacher, {
        status: "IN_PROGRESS",
        progress: 40,
      }).expect(200);
      expect(res.body).toMatchObject({ status: "IN_PROGRESS", progress: 40 });
    });

    it("400, 401, 403 and 404", async () => {
      await call("patch", `/api/tasks/${taskId}`, teacher, {
        status: "FERTIG",
      }).expect(400);
      await call("patch", `/api/tasks/${taskId}`, undefined, {
        title: "x",
      }).expect(401);
      await call("patch", `/api/tasks/${taskId}`, nobody, {
        title: "x",
      }).expect(403);
      await call("patch", "/api/tasks/999999", teacher, { title: "x" }).expect(
        404,
      );
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("400: refuses a task with subtasks (08_…:132)", async () => {
      const parent = (
        await call("post", "/api/tasks", teacher, {
          title: "Mit Subtask",
          deadline: "2026-12-01",
        }).expect(201)
      ).body as { task_id: number };
      await call("post", "/api/tasks", teacher, {
        title: "Subtask",
        deadline: "2026-12-01",
        parent_task_id: parent.task_id,
      }).expect(201);

      await call("delete", `/api/tasks/${parent.task_id}`, teacher).expect(400);
    });

    it("401, 403 and 404", async () => {
      await call("delete", `/api/tasks/${taskId}`).expect(401);
      // the assigned student sees it but may not delete someone else's task
      await call("delete", `/api/tasks/${taskId}`, student).expect(403);
      await call("delete", `/api/tasks/${taskId}`, nobody).expect(403);
      await call("delete", "/api/tasks/999999", teacher).expect(404);
    });

    it("200: the creator deletes the task", async () => {
      await call("delete", `/api/tasks/${taskId}`, teacher).expect(200);
      await call("get", `/api/tasks/${taskId}`, teacher).expect(404);
    });
  });
});
