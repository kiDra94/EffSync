import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M24: the new dashboard metrics against PostgreSQL (the recursive
// subtree query and the ranking run here for real)
describe("Reporting metrics (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: string;

  const get = (url: string) =>
    request(app.getHttpServer())
      .get(url)
      .set("Authorization", `Bearer ${admin}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    admin = (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "adminadmin", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("shows an active project with the progress of its whole subtree", async () => {
    const project = await prisma.tasks.create({
      data: {
        title: "Reporting-Projekt",
        created_by: 2,
        status: "IN_PROGRESS",
      },
    });
    const sub = await prisma.tasks.create({
      data: {
        title: "Teil A",
        created_by: 2,
        parent_task_id: project.task_id,
        status: "COMPLETED",
      },
    });
    // a grandchild counts too
    await prisma.tasks.create({
      data: { title: "Teil A.1", created_by: 2, parent_task_id: sub.task_id },
    });

    const projects = (await get("/api/metrics/projects").expect(200)).body as {
      task_id: number;
      progress: number;
      subtask_count: number;
    }[];
    const found = projects.find((p) => p.task_id === project.task_id);
    expect(found).toMatchObject({ subtask_count: 2, progress: 50 });
    // subtasks are no projects
    expect(projects.map((p) => p.task_id)).not.toContain(sub.task_id);
  });

  it("ranks at most five members by completed tasks", async () => {
    await prisma.tasks.createMany({
      data: [1, 2, 3].map((n) => ({
        title: `Erledigt ${n}`,
        created_by: 2,
        assigned_to: 8,
        status: "COMPLETED" as const,
      })),
    });

    const top = (await get("/api/metrics/top-members").expect(200)).body as {
      user_id: number;
      completed: number;
    }[];
    expect(top.length).toBeLessThanOrEqual(5);
    expect(top[0].completed).toBeGreaterThanOrEqual(
      top[top.length - 1].completed,
    );
    expect(top.map((m) => m.user_id)).toContain(8);
  });

  it("answers the weekly and monthly trends, and 400 for another period", async () => {
    const week = (await get("/api/metrics/trends?period=week").expect(200))
      .body as { labels: string[]; created: number[] };
    expect(week.labels).toHaveLength(8);
    expect(week.created.at(-1)).toBeGreaterThan(0);
    const month = (await get("/api/metrics/trends?period=month").expect(200))
      .body as { labels: string[] };
    expect(month.labels).toHaveLength(6);
    await get("/api/metrics/trends?period=year").expect(400);
  });
});
