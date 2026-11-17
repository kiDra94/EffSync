import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M17, decision B3: a student's visible set (assigned, created and
// member tasks plus all subtasks) is paged and counted, and a task outside it
// doesn't exist for them (404)
describe("Task visibility for students (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let ownTaskId: number;
  let studentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    const prisma = app.get(PrismaService);

    // a student of their own: 5 assigned projects with 4 subtasks each,
    // all created by the teacher Anna (2), so 25 visible tasks
    const student = await prisma.users.create({
      data: {
        firstname: "Paul",
        lastname: "Paging",
        username: "ppaging",
        email: "paul.paging@student.htl.at",
        password_hash: await bcrypt.hash("password123", 4),
        user_roles: { create: { role_id: 2 } },
      },
    });
    studentId = student.user_id;
    // M37: each first step is completed, project 2 is overdue, and every
    // project stands at 50 %, for the metrics over the same visible set
    for (let project = 1; project <= 5; project++) {
      const root = await prisma.tasks.create({
        data: {
          title: `Paging-Projekt ${project}`,
          created_by: 2,
          assigned_to: student.user_id,
          progress: 50,
          deadline: project === 2 ? new Date("2020-01-01") : null,
        },
      });
      ownTaskId = root.task_id;
      for (let sub = 1; sub <= 4; sub++) {
        await prisma.tasks.create({
          data: {
            title: `Paging-Schritt ${project}.${sub}`,
            created_by: 2,
            parent_task_id: root.task_id,
            status: sub === 1 ? "COMPLETED" : "TODO",
          },
        });
      }
    }

    token = (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "ppaging", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (url: string) =>
    request(app.getHttpServer())
      .get(url)
      .set("Authorization", `Bearer ${token}`);

  it("pages 25 visible tasks by 10 into 10, 10 and 5", async () => {
    const pages: {
      data: unknown[];
      meta: { total: number; totalPages: number };
    }[] = [];
    for (const page of [1, 2, 3]) {
      pages.push(
        (await get(`/api/tasks?limit=10&page=${page}`).expect(200)).body as {
          data: unknown[];
          meta: { total: number; totalPages: number };
        },
      );
    }

    expect(pages.map((p) => p.data.length)).toEqual([10, 10, 5]);
    for (const p of pages) {
      expect(p.meta).toMatchObject({ total: 25, totalPages: 3 });
    }
  });

  // M37: the list is filtered, sorted, paged and counted inside the database
  describe("filters and sorting over the visible set", () => {
    type Page = {
      data: { task_id: number; title: string; parent_task_id: number | null }[];
      meta: { total: number; totalPages: number };
    };
    const list = async (query: string) =>
      (await get(`/api/tasks?${query}`).expect(200)).body as Page;

    it("sorts by title across pages, with the task id breaking ties", async () => {
      const first = await list("sortBy=title&sortOrder=asc&limit=10&page=1");
      const second = await list("sortBy=title&sortOrder=asc&limit=10&page=2");
      const titles = [...first.data, ...second.data].map((t) => t.title);
      expect(titles).toEqual(
        [...titles].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
      );
      expect(titles[0]).toBe("Paging-Projekt 1");
    });

    it("combines status, parent and search filters with the visible set", async () => {
      expect((await list("status=COMPLETED")).meta.total).toBe(5);
      const roots = await list("parent_task_id=0");
      expect(roots.meta.total).toBe(5);
      expect(roots.data.every((t) => t.parent_task_id === null)).toBe(true);
      expect((await list("search=schritt%203.")).meta.total).toBe(4);
      // a % in the search is a character, not a wildcard
      expect((await list("search=%25")).meta.total).toBe(0);
    });

    it("counts the visible set on a page past the end", async () => {
      const past = await list("limit=10&page=9");
      expect(past.data).toEqual([]);
      expect(past.meta.total).toBe(25);
    });

    it("answers 400 for a sort key that isn't a task column", async () => {
      await get("/api/tasks?sortBy=password_hash").expect(400);
    });
  });

  it("computes the metrics over the same visible set", async () => {
    const progress = (await get("/api/metrics/task-progress").expect(200))
      .body as Record<string, number>;
    expect(progress).toEqual({
      totalTasks: 25,
      completedTasks: 5,
      openTasks: 20,
      completionRate: 20,
      averageProgress: 10,
      overtasks: 1,
      percentageOverdue: 4,
    });

    const distribution = (
      await get("/api/metrics/status-distribution").expect(200)
    ).body as { data: number[]; total: number };
    expect(distribution).toMatchObject({
      data: [19, 0, 0, 5, 0, 1],
      total: 25,
    });

    const projects = (await get("/api/metrics/projects").expect(200)).body as {
      task_id: number;
    }[];
    expect(projects).toHaveLength(5);
  });

  it("lets staff list and count every task", async () => {
    const admin = (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "adminadmin", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
    const all = await app.get(PrismaService).tasks.count();
    const asAdmin = (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set("Authorization", `Bearer ${admin}`)
        .expect(200);

    const page = (await asAdmin("/api/tasks?limit=1")).body as {
      meta: { total: number };
    };
    expect(page.meta.total).toBe(all);
    const progress = (await asAdmin("/api/metrics/task-progress")).body as {
      totalTasks: number;
    };
    expect(progress.totalTasks).toBe(all);
  });

  it("answers 404 on the comments of a task outside the visible set", async () => {
    // task 1 "Mathe Test" belongs to Anna and Felix
    await get("/api/tasks/1/comments").expect(404);
    await request(app.getHttpServer())
      .post("/api/tasks/1/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Darf ich nicht" })
      .expect(404);
    await get("/api/tasks/1").expect(404);

    await get(`/api/tasks/${ownTaskId}/comments`).expect(200);
  });

  // M17 review: every /tasks/:id… route, also writes, is a 404 outside the set
  it.each([
    ["patch", "/api/tasks/1", { title: "Übernommen" }],
    ["delete", "/api/tasks/1", undefined],
    ["post", "/api/tasks/1/members", "self"],
    ["get", "/api/tasks/1/members/check-permission", undefined],
    ["post", "/api/tasks/1/lock", {}],
  ] as const)("answers 404 on %s %s", async (method, url, body) => {
    const call = request(app.getHttpServer())
      [method](url)
      .set("Authorization", `Bearer ${token}`);
    await (
      body === "self"
        ? call.send({ user_id: studentId })
        : body
          ? call.send(body)
          : call
    ).expect(404);
  });
});
