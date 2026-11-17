import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M19: documents and notes in their bounded context; the bugs the
// migration fixed, through the HTTP API
describe("Documents and notes (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacher: string;
  let student: string;
  let studentId: number;

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
  const upload = (token: string, name: string, taskId?: number) => {
    const req = request(app.getHttpServer())
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("%PDF-1.4 Abgabe"), name);
    return taskId ? req.field("taskId", String(taskId)) : req;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    teacher = await login("alehrerin");
    student = await login("ffuchs");
    studentId = (
      await prisma.users.findFirstOrThrow({ where: { username: "ffuchs" } })
    ).user_id;
  });

  afterAll(async () => {
    await app.close();
  });

  // the include named `tasks`, a relation notes don't have
  it("lists and reads a note with its relations", async () => {
    const note = (
      await call("post", "/api/notes", student, {
        title: "Lernplan",
        description: "Kapitel 3 wiederholen",
        priority: "high",
      }).expect(201)
    ).body as { note_id: number; priority: string };
    expect(note.priority).toBe("high");

    const notes = (await call("get", "/api/notes", student).expect(200))
      .body as { note_id: number; users: Record<string, unknown> }[];
    expect(notes.map((n) => n.note_id)).toContain(note.note_id);

    await call("get", `/api/notes/${note.note_id}`, student).expect(200);
    // personal: another user doesn't reach it
    await call("get", `/api/notes/${note.note_id}`, teacher).expect(404);
  });

  // the foreign keys of note_documents and notes_users are NoAction
  it("deletes a note that has a document and a share", async () => {
    const note = (
      await call("post", "/api/notes", student, {
        title: "Mit Anhang",
        description: "Notiz mit Dokument",
      }).expect(201)
    ).body as { note_id: number };
    const document = (await upload(student, "notiz.pdf").expect(201)).body as {
      document_id: number;
    };
    const teacherId = (
      await prisma.users.findFirstOrThrow({
        where: { username: "alehrerin" },
      })
    ).user_id;
    await prisma.note_documents.create({
      data: { note_id: note.note_id, document_id: document.document_id },
    });
    await prisma.notes_users.create({
      data: { note_id: note.note_id, user_id: teacherId },
    });

    await call("delete", `/api/notes/${note.note_id}`, student).expect(200);

    expect(await prisma.notes.count({ where: { note_id: note.note_id } })).toBe(
      0,
    );
    // the document itself stays
    expect(
      await prisma.documents.count({
        where: { document_id: document.document_id },
      }),
    ).toBe(1);
  });

  // BUG fixed in M19: the reopened task was "locked until" the new deadline
  it("grades a submission and reopens its task without a lock date", async () => {
    const title = `Referat abgeben ${Date.now()}`;
    const task = (
      await call("post", "/api/tasks", teacher, {
        title,
        deadline: "2026-12-01",
        assigned_to: studentId,
      }).expect(201)
    ).body as { task_id: number };
    const document = (
      await upload(student, "referat.pdf", task.task_id).expect(201)
    ).body as { document_id: number; linked_task_ids: number[] };
    expect(document.linked_task_ids).toEqual([task.task_id]);

    const graded = (
      await call(
        "patch",
        `/api/documents/${document.document_id}/grade`,
        teacher,
        {
          grade: "2",
          feedback: "Gut gemacht",
        },
      ).expect(200)
    ).body as { grade: string; permissions: { can_delete: boolean } };
    expect(graded.grade).toBe("2");
    // a graded document can no longer be deleted by the student
    await call(
      "delete",
      `/api/documents/${document.document_id}`,
      student,
    ).expect(403);

    // review M19 (5): a deadline that isn't a date is a 400, not a 500
    await call(
      "patch",
      `/api/documents/${document.document_id}/allow-resubmit`,
      teacher,
      { new_deadline: "morgen" },
    ).expect(400);
    await call(
      "patch",
      `/api/documents/${document.document_id}/allow-resubmit`,
      teacher,
      { new_deadline: "2026-12-15" },
    ).expect(200);
    const reopened = await prisma.tasks.findUniqueOrThrow({
      where: { task_id: task.task_id },
    });
    expect(reopened.is_locked).toBe(false);
    expect(reopened.locked_until).toBeNull();
    expect(reopened.deadline?.toISOString().slice(0, 10)).toBe("2026-12-15");
    expect(
      await prisma.notifications.count({
        where: {
          user_id: studentId,
          type: "RESUBMIT_ALLOWED",
          text: { contains: title },
        },
      }),
    ).toBe(1);

    // fixed in M19: the task's documents name their uploader
    const byTask = (
      await call(
        "get",
        `/api/documents/by-task/${task.task_id}`,
        teacher,
      ).expect(200)
    ).body as { uploader: { user_id: number } | null }[];
    expect(byTask[0].uploader?.user_id).toBe(studentId);
  });

  // review M19 (5): a document ID that isn't a number is a 400, not a 500
  it("rejects a document ID that isn't a number", async () => {
    await call("get", "/api/documents/abc", teacher).expect(400);
    await call("delete", "/api/documents/abc", teacher).expect(400);
  });
});
