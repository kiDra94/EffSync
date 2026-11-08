import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M21: DM deduplication (T113) and task- and class-linked chats (T29)
describe("Direct, task and class chats (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacher: string; // user 2
  let student: string; // user 4
  let other: string; // user 5

  const login = async (identifier: string) =>
    (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier, password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  const post = (url: string, token: string, body: object = {}) =>
    request(app.getHttpServer())
      .post(url)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  const roomId = (res: { body: unknown }) =>
    (res.body as { room_id: number }).room_id;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    teacher = await login("alehrerin");
    student = await login("ffuchs");
    other = await login("lgruber");
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates the same DM twice and gets one room", async () => {
    const first = await post("/api/chat-rooms/direct", student, {
      user_id: 6,
    }).expect(201);
    // the other side starting it, and a second click
    const second = await post("/api/chat-rooms/direct", student, {
      user_id: 6,
    }).expect(201);
    expect(roomId(second)).toBe(roomId(first));

    const room = await prisma.chat_rooms.findUniqueOrThrow({
      where: { room_id: roomId(first) },
      include: { chat_room_users: true },
    });
    expect(room.direct_chat_hash).toBe("direct_4_6");
    expect(room.is_private).toBe(true);
    expect(room.chat_room_users.map((m) => m.user_id).sort()).toEqual([4, 6]);

    // the seed's DM Anna <-> Felix has the same hash format
    const seeded = await post("/api/chat-rooms/direct", teacher, {
      user_id: 4,
    }).expect(201);
    expect(
      (
        await prisma.chat_rooms.findUniqueOrThrow({
          where: { room_id: roomId(seeded) },
        })
      ).direct_chat_hash,
    ).toBe("direct_2_4");

    // no DM with oneself, and a client's own hash is ignored
    await post("/api/chat-rooms/direct", student, { user_id: 4 }).expect(400);
    const group = await post("/api/chat-rooms", student, {
      name: "Mit Hash",
      direct_chat_hash: "direct_4_6",
      // review M21: a room of one's own can't become a class's or task's chat
      class_id: 1,
    }).expect(201);
    expect(
      (
        await prisma.chat_rooms.findUniqueOrThrow({
          where: { room_id: roomId(group) },
        })
      ).direct_chat_hash,
    ).toBeNull();
    expect(
      (
        await prisma.chat_rooms.findUniqueOrThrow({
          where: { room_id: roomId(group) },
        })
      ).class_id,
    ).toBeNull();
  });

  it("opens one chat per task with task_id set and the task's people as members", async () => {
    const task = (
      await post("/api/tasks", teacher, {
        title: "Projektarbeit Chat",
        deadline: "2026-12-01",
        assigned_to: 4,
      }).expect(201)
    ).body as { task_id: number };

    const opened = await post(
      `/api/chat-rooms/task/${task.task_id}`,
      student,
    ).expect(201);
    const again = await post(
      `/api/chat-rooms/task/${task.task_id}`,
      teacher,
    ).expect(201);
    expect(roomId(again)).toBe(roomId(opened));

    const room = await prisma.chat_rooms.findUniqueOrThrow({
      where: { room_id: roomId(opened) },
      include: { chat_room_users: true },
    });
    expect(room.task_id).toBe(task.task_id);
    expect(room.is_private).toBe(false);
    expect(room.chat_room_users.map((m) => m.user_id).sort()).toEqual([2, 4]);

    // review M21 (6): leaving sticks when someone else opens the chat
    await request(app.getHttpServer())
      .delete(`/api/chat-rooms/${roomId(opened)}/members/4`)
      .set("Authorization", `Bearer ${student}`)
      .expect(200);
    await post(`/api/chat-rooms/task/${task.task_id}`, teacher).expect(201);
    expect(
      await prisma.chat_room_users.count({
        where: { room_id: roomId(opened), user_id: 4, left_at: null },
      }),
    ).toBe(0);
    // and opening it oneself joins again
    await post(`/api/chat-rooms/task/${task.task_id}`, student).expect(201);
    expect(
      await prisma.chat_room_users.count({
        where: { room_id: roomId(opened), user_id: 4, left_at: null },
      }),
    ).toBe(1);
    // the task's creator owns its chat (review M21 (7))
    expect(room.created_by).toBe(2);

    // someone who doesn't see the task gets no chat for it
    await post(`/api/chat-rooms/task/${task.task_id}`, other).expect(404);
  });

  it("opens the class chat with the class's students and teachers", async () => {
    const opened = await post("/api/chat-rooms/class/1", student).expect(201);
    // the seed's "5AHITM Klassenchat" is the class's chat; no second one
    expect(roomId(opened)).toBe(2);
    expect(
      roomId(await post("/api/chat-rooms/class/1", teacher).expect(201)),
    ).toBe(2);

    // every current member of the class is in it (decision D2); other E2E
    // files change the class, so the expectation is read from the API
    const cls = (
      await request(app.getHttpServer())
        .get("/api/classes/1")
        .set("Authorization", `Bearer ${teacher}`)
        .expect(200)
    ).body as {
      students: { user_id: number }[];
      teachers: { user_id: number }[];
    };
    const members = (
      await prisma.chat_room_users.findMany({
        where: { room_id: 2, left_at: null },
      })
    ).map((m) => m.user_id);
    expect(members).toEqual(
      expect.arrayContaining(
        [...cls.students, ...cls.teachers].map((p) => p.user_id),
      ),
    );
  });
});
