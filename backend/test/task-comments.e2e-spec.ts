import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

interface OutboxMail {
  to: string;
  subject: string;
  html: string;
}

// GOALS.md M27 (T09, T74, decision Q16): a comment in the task detail view,
// with an @mention that mails the mentioned user
describe("Task comments with @mentions (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacher: string;
  let taskId: number;
  const outbox = process.env.MAIL_OUTBOX_DIR as string;
  const title = "Kommentar-Projekt M27";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    taskId = (await prisma.tasks.create({ data: { title, created_by: 2 } }))
      .task_id;
    teacher = (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "alehrerin", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  });

  afterAll(async () => {
    await app.close();
  });

  // the mail goes out after the answer
  const waitForMail = async (to: string) => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const mail = readdirSync(outbox)
        .map(
          (file) =>
            JSON.parse(readFileSync(join(outbox, file), "utf8")) as OutboxMail,
        )
        .find((m) => m.to === to && m.subject.includes(title));
      if (mail) return mail;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`no mention mail to ${to}`);
  };

  it("writes a comment with an @mention, lists it and mails the mentioned user", async () => {
    const felix = await prisma.users.findUniqueOrThrow({
      where: { username: "ffuchs" },
    });

    const created = await request(app.getHttpServer())
      .post(`/api/tasks/${taskId}/comments`)
      .set("Authorization", `Bearer ${teacher}`)
      .send({ content: "Bitte ansehen @ffuchs" })
      .expect(201);
    // review M27: the list shows the new comment with its author at once
    expect(
      (created.body as { users: { firstname: string } }).users.firstname,
    ).toBe("Anna");

    const comments = (
      await request(app.getHttpServer())
        .get(`/api/tasks/${taskId}/comments`)
        .set("Authorization", `Bearer ${teacher}`)
        .expect(200)
    ).body as { content: string; users: { firstname: string } }[];
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe("Bitte ansehen @ffuchs");
    expect(comments[0].users.firstname).toBe("Anna");

    const mail = await waitForMail(felix.email);
    expect(mail.subject).toBe(`📢 Du wurdest erwähnt: ${title}`);
    expect(mail.html).toContain("@ffuchs");
  });
});
