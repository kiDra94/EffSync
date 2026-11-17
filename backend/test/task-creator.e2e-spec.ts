import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M33 (T101, 07_…:82, decision Q20): "auf Datenbankebene
// sichergestellt, dass jede Aufgabe einem Ersteller … zugewiesen ist"
describe("Task creator at database level (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // review M33: the not-null violation (SQLSTATE 23502) of exactly this column
  const notNullOfCreator = /23502|null value in column "created_by"/;

  it("refuses a task without a creator, whoever writes it", async () => {
    // past the app and Prisma's types: the database itself says no
    await expect(
      prisma.$executeRaw`INSERT INTO tasks (title) VALUES ('Ohne Ersteller')`,
    ).rejects.toThrow(notNullOfCreator);

    const own = await prisma.tasks.create({
      data: { title: "Mit Ersteller", created_by: 2 },
    });
    await expect(
      prisma.$executeRaw`UPDATE tasks SET created_by = NULL WHERE task_id = ${own.task_id}`,
    ).rejects.toThrow(notNullOfCreator);
  });

  it("refuses a creator of null through the API (400, not 500)", async () => {
    const own = await prisma.tasks.create({
      data: { title: "API", created_by: 2 },
    });
    const token = (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "alehrerin", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;

    await request(app.getHttpServer())
      .patch(`/api/tasks/${own.task_id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ created_by: null })
      .expect((res) => expect(res.status).toBeLessThan(500));
    await expect(
      prisma.tasks.findUnique({ where: { task_id: own.task_id } }),
    ).resolves.toMatchObject({ created_by: 2 });
  });

  it("refuses a creator that isn't a user", async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO tasks (title, created_by) VALUES ('Fremd', 999999)`,
    ).rejects.toThrow(/foreign key|created_by/i);
  });

  it("knows the ghost user 0, who keeps the tasks of deleted accounts", async () => {
    await expect(
      prisma.users.findUnique({ where: { user_id: 0 } }),
    ).resolves.toMatchObject({ username: "geloeschter-nutzer" });
  });
});
