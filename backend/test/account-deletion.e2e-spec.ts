import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// THESIS: T10 (03_…:295-299, GOALS.md M14, decision H1) – deleting an account
// anonymizes it: shared content moves to the ghost user 0, the personal
// record is deleted, and the chat history stays intact
describe("Account deletion with the ghost user (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let leaverId: number;
  let taskDocumentId: number;
  let privateDocumentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);

    // a user of its own, so the other E2E files keep their seed users:
    // member of the class chat (room 2), with a message, a task and a comment
    const leaver = await prisma.users.create({
      data: {
        firstname: "Lea",
        lastname: "Verlassen",
        username: "lverlassen",
        email: "lea.verlassen@student.htl.at",
        password_hash: await bcrypt.hash("password123", 4),
        user_roles: { create: { role_id: 2 } },
      },
    });
    leaverId = leaver.user_id;
    await prisma.chat_room_users.create({
      data: { room_id: 2, user_id: leaverId },
    });
    await prisma.chat_messages.create({
      data: {
        room_id: 2,
        user_id: leaverId,
        message: "Ich verlasse die Schule.",
      },
    });
    const task = await prisma.tasks.create({
      data: { title: "Abschlussprojekt Lea", created_by: leaverId },
    });
    await prisma.comments.create({
      data: { task_id: task.task_id, created_by: leaverId, content: "Fertig." },
    });
    await prisma.notifications.create({
      data: { user_id: leaverId, text: "persönlich", type: "info" },
    });
    // what chat-messages.service writes into the other members' notifications
    await prisma.notifications.create({
      data: {
        user_id: 2,
        text: "💬 Lea Verlassen: Ich verlasse die Schule.",
        type: "chat_message",
      },
    });
    // an upload attached to the task stays, a file on a private note goes
    const taskDocument = await prisma.documents.create({
      data: {
        name: "abgabe-lea.pdf",
        added_by: leaverId,
        task_documents: { create: { task_id: task.task_id } },
      },
    });
    taskDocumentId = taskDocument.document_id;
    const note = await prisma.notes.create({
      data: { title: "Privat", created_by: leaverId },
    });
    const privateDocument = await prisma.documents.create({
      data: {
        name: "privat-lea.pdf",
        added_by: leaverId,
        note_documents: { create: { note_id: note.note_id } },
      },
    });
    privateDocumentId = privateDocument.document_id;

    adminToken = (
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

  const deleteUser = (userId: number) =>
    request(app.getHttpServer())
      .delete(`/api/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`);

  it("seeds the ghost user 0, which can't sign in", async () => {
    const ghost = await prisma.users.findUniqueOrThrow({
      where: { user_id: 0 },
    });
    expect(ghost.password_hash).toBeNull();
    expect(ghost.google_id).toBeNull();
  });

  it("keeps the chat history under the ghost user and deletes the personal record", async () => {
    await deleteUser(leaverId).expect(200);

    // the class chat, read by a teacher who is a member
    const teacherToken = (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "alehrerin", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
    const messages = (
      await request(app.getHttpServer())
        .get("/api/chat-rooms/2/messages")
        .set("Authorization", `Bearer ${teacherToken}`)
        .expect(200)
    ).body as {
      message: string;
      user_id: number;
      users: { firstname: string; lastname: string };
    }[];
    const farewell = messages.find(
      (m) => m.message === "Ich verlasse die Schule.",
    );
    expect(farewell).toMatchObject({
      user_id: 0,
      users: { firstname: "Gelöschter", lastname: "Nutzer" },
    });
    // the seed messages are still there and in order
    expect(messages.map((m) => m.message).slice(0, 3)).toEqual([
      "5AHITM! Die nächste Schularbeit findet am Freitag im EDV 1 statt.",
      "Wie lange haben wir Zeit für die Schularbeit?",
      "90 Minuten. Geschlossenes Buch.",
    ]);

    // task authorship and comments moved, the personal rows are gone
    const task = await prisma.tasks.findFirstOrThrow({
      where: { title: "Abschlussprojekt Lea" },
      include: { comments: true },
    });
    expect(task.created_by).toBe(0);
    expect(task.comments.map((c) => c.created_by)).toEqual([0]);
    expect(
      await prisma.users.findUnique({ where: { user_id: leaverId } }),
    ).toBeNull();
    expect(
      await prisma.notifications.count({ where: { user_id: leaverId } }),
    ).toBe(0);
    expect(
      await prisma.chat_room_users.count({ where: { user_id: leaverId } }),
    ).toBe(0);
    expect(
      await prisma.users.count({
        where: { email: "lea.verlassen@student.htl.at" },
      }),
    ).toBe(0);

    // the name is gone from other members' notifications
    expect(
      await prisma.notifications.findMany({
        where: {
          user_id: 2,
          type: "chat_message",
          text: { contains: "Ich verlasse" },
        },
        select: { text: true },
      }),
    ).toEqual([{ text: "💬 Gelöschter Nutzer: Ich verlasse die Schule." }]);
    // the task's upload stays under the ghost user, the private file is deleted
    expect(
      await prisma.documents.findUnique({
        where: { document_id: taskDocumentId },
      }),
    ).toMatchObject({ added_by: 0 });
    expect(
      await prisma.documents.findUnique({
        where: { document_id: privateDocumentId },
      }),
    ).toBeNull();
    expect(await prisma.notes.count({ where: { title: "Privat" } })).toBe(0);

    // the account can't sign in any more
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: "lverlassen", password: "password123" })
      .expect(401);
  });

  it("refuses to delete or change the ghost user", async () => {
    await deleteUser(0).expect(400);
    await request(app.getHttpServer())
      .patch("/api/users/0")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "jemand@gmail.com" })
      .expect(400);
  });

  it("refuses to delete the own account", async () => {
    await deleteUser(1).expect(400);
  });

  it("refuses to delete a teacher who is still class teacher (409)", async () => {
    // Peter Schmidt (user 3) teaches 5AHITM
    await deleteUser(3).expect(409);
    expect(
      await prisma.users.findUnique({ where: { user_id: 3 } }),
    ).not.toBeNull();
  });

  it("answers 404 for an unknown user", async () => {
    await deleteUser(99999).expect(404);
  });
});
