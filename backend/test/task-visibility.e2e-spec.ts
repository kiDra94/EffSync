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
    for (let project = 1; project <= 5; project++) {
      const root = await prisma.tasks.create({
        data: {
          title: `Paging-Projekt ${project}`,
          created_by: 2,
          assigned_to: student.user_id,
        },
      });
      ownTaskId = root.task_id;
      for (let sub = 1; sub <= 4; sub++) {
        await prisma.tasks.create({
          data: {
            title: `Paging-Schritt ${project}.${sub}`,
            created_by: 2,
            parent_task_id: root.task_id,
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
