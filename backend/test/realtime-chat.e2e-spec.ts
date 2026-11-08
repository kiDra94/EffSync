import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { io, Socket } from "socket.io-client";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M20: the chat over the shared realtime transport, with two real
// Socket.io clients (the automated part of the check from 08_…:216: both
// directions, and the history survives a reload)
describe("Realtime chat (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let url: string;
  let teacher: string;
  let student: string;
  let studentId: number;
  const sockets: Socket[] = [];

  const login = async (identifier: string) =>
    (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier, password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  const connect = (token?: string) => {
    const socket = io(url, {
      auth: token ? { token } : {},
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    sockets.push(socket);
    return socket;
  };
  /** The next `event` on the socket whose data passes `matches`. */
  const next = <T>(
    socket: Socket,
    event: string,
    matches: (data: T) => boolean = () => true,
  ) =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off(event, listener);
        reject(new Error(`no ${event} within 5 s`));
      }, 5000);
      const listener = (data: T) => {
        if (!matches(data)) return;
        clearTimeout(timer);
        socket.off(event, listener);
        resolve(data);
      };
      socket.on(event, listener);
    });
  const joinRoom = async (socket: Socket, roomId: number) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const answer = Promise.race([
        next(socket, "room:user-joined").then(
          () => true,
          () => false,
        ),
        next(socket, "error").then(
          () => false,
          () => false,
        ),
      ]);
      socket.emit("join:room", roomId);
      if (await answer) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`could not join room ${roomId}`);
  };
  const message = (text: string) => (data: { message: string }) =>
    data.message === text;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    await app.listen(0);
    url = await app.getUrl();
    prisma = app.get(PrismaService);
    teacher = await login("alehrerin");
    student = await login("ffuchs");
    studentId = (
      await prisma.users.findFirstOrThrow({ where: { username: "ffuchs" } })
    ).user_id;
  });

  afterAll(async () => {
    for (const socket of sockets) socket.disconnect();
    await app.close();
  });

  it("delivers messages in both directions and keeps the history", async () => {
    const room = (
      await request(app.getHttpServer())
        .post("/api/chat-rooms")
        .set("Authorization", `Bearer ${teacher}`)
        .send({ name: "Echtzeit-Test" })
        .expect(201)
    ).body as { room_id: number };
    await request(app.getHttpServer())
      .post(`/api/chat-rooms/${room.room_id}/members`)
      .set("Authorization", `Bearer ${teacher}`)
      .send({ userId: studentId })
      .expect(201);

    const teacherSocket = connect(teacher);
    const studentSocket = connect(student);
    await Promise.all([
      next(teacherSocket, "connect"),
      next(studentSocket, "connect"),
    ]);
    // opening the room, as ChatView does. The token check runs after the
    // client's "connect", so an early join:room gets an "error" (as before
    // M20): retry until the socket's own room:user-joined confirms it
    for (const socket of [teacherSocket, studentSocket]) {
      await joinRoom(socket, room.room_id);
    }

    // teacher → student
    const toStudent = next(
      studentSocket,
      "chat:new",
      message("Hallo aus dem Lehrerzimmer"),
    );
    const notified = next<{ type: string; text: string }>(
      studentSocket,
      "notification:new",
    );
    teacherSocket.emit("chat:send", {
      roomId: room.room_id,
      message: "Hallo aus dem Lehrerzimmer",
    });
    expect((await toStudent).message).toBe("Hallo aus dem Lehrerzimmer");
    // the notification goes through the same transport (event name unchanged)
    expect(await notified).toMatchObject({ type: "chat_message" });

    // student → teacher
    // (the sender gets its own message back too, as before M20)
    const toTeacher = next(
      teacherSocket,
      "chat:new",
      message("Danke, angekommen"),
    );
    studentSocket.emit("chat:send", {
      roomId: room.room_id,
      message: "Danke, angekommen",
    });
    expect((await toTeacher).message).toBe("Danke, angekommen");

    // a reload reads the history from the REST route
    const history = (
      await request(app.getHttpServer())
        .get(`/api/chat-rooms/${room.room_id}/messages`)
        .set("Authorization", `Bearer ${student}`)
        .expect(200)
    ).body as { message: string }[];
    expect(history.map((m) => m.message)).toEqual([
      "Hallo aus dem Lehrerzimmer",
      "Danke, angekommen",
    ]);
  });

  it("refuses a socket without a valid token", async () => {
    // the listeners are attached before either refusal can arrive
    const refused = [connect(), connect("kein-jwt")];
    await Promise.all(refused.map((socket) => next(socket, "disconnect")));
    for (const socket of refused) expect(socket.connected).toBe(false);
  });
});
