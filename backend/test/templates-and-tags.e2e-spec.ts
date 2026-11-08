import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M18: task templates (T110, decisions H2 and E1) and tags (T59, Q8e)
describe("Task templates and tags (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacher: string;
  let student: string;

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
    token: string,
    body?: object,
  ) => {
    const req = request(app.getHttpServer())
      [method](url)
      .set("Authorization", `Bearer ${token}`);
    return body ? req.send(body) : req;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    teacher = await login("alehrerin");
    student = await login("ffuchs");
  });

  afterAll(async () => {
    await app.close();
  });

  it("saves a task as a private template and creates a task from it", async () => {
    const source = (
      await call("post", "/api/tasks", teacher, {
        title: "Wöchentliche Hausübung",
        description: "Kapitel lesen und Aufgaben lösen",
        deadline: "2026-12-01",
      }).expect(201)
    ).body as { title: string; description: string };

    // "save as template": the task's title becomes the name (decision H2)
    const template = (
      await call("post", "/api/tasks/templates", teacher, {
        name: source.title,
        description: source.description,
      }).expect(201)
    ).body as { template_id: number; user: Record<string, unknown> };
    expect(template.user).not.toHaveProperty("email");

    const own = (await call("get", "/api/tasks/templates", teacher).expect(200))
      .body as { template_id: number }[];
    expect(own.map((t) => t.template_id)).toContain(template.template_id);

    // private (decision E1): other users neither list nor read it
    const others = (
      await call("get", "/api/tasks/templates", student).expect(200)
    ).body as { template_id: number }[];
    expect(others.map((t) => t.template_id)).not.toContain(
      template.template_id,
    );
    await call(
      "get",
      `/api/tasks/templates/${template.template_id}`,
      student,
    ).expect(404);

    // applying it: the form takes name and description, the user adds the deadline
    const fromTemplate = (
      await call("post", "/api/tasks", teacher, {
        title: "Wöchentliche Hausübung",
        description: "Kapitel lesen und Aufgaben lösen",
        deadline: "2026-12-08",
        template_id: template.template_id,
      }).expect(201)
    ).body as { task_id: number; template_id: number };
    expect(fromTemplate.template_id).toBe(template.template_id);
    // someone else's template can't be linked
    await call("post", "/api/tasks", student, {
      title: "Fremd",
      deadline: "2026-12-08",
      template_id: template.template_id,
    }).expect(404);

    // deleting the template keeps the task, without the link
    await call(
      "delete",
      `/api/tasks/templates/${template.template_id}`,
      teacher,
    ).expect(200);
    const task = await prisma.tasks.findUniqueOrThrow({
      where: { task_id: fromTemplate.task_id },
    });
    expect(task.template_id).toBeNull();
  });

  it("creates a task with two tags and reads them back", async () => {
    const created = (
      await call("post", "/api/tasks", teacher, {
        title: "Getaggte Aufgabe",
        deadline: "2026-12-01",
        tags: ["Mathe", " Projekt ", "mathe"],
      }).expect(201)
    ).body as { task_id: number };

    const tagsOf = async () =>
      (
        (
          await call("get", `/api/tasks/${created.task_id}`, teacher).expect(
            200,
          )
        ).body as { task_tags: { tags: { name: string } }[] }
      ).task_tags
        .map((t) => t.tags.name)
        .sort();

    expect(await tagsOf()).toEqual(["mathe", "projekt"]);

    await call("patch", `/api/tasks/${created.task_id}`, teacher, {
      tags: ["Projekt"],
    }).expect(200);
    expect(await tagsOf()).toEqual(["projekt"]);

    // deleting the task removes its task_tags rows; the tags stay for reuse
    await call("delete", `/api/tasks/${created.task_id}`, teacher).expect(200);
    expect(
      await prisma.task_tags.count({ where: { task_id: created.task_id } }),
    ).toBe(0);
    expect(await prisma.tags.count({ where: { name: "mathe" } })).toBe(1);
  });
});
