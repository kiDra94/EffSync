import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { createTestApp } from "./setup/create-test-app";

// Chat-room authorization (GOALS.md M6, T02, T114, T96, T128) against the
// test seed: room 1 is Anna's direct chat with Felix, room 2 is the class
// chat Anna created, with Felix (4), Laura (5) and others as members.
const ANNA = { username: "alehrerin", id: 2 };
const FELIX = { username: "ffuchs", id: 4 };
const LAURA_ID = 5;
const ADMIN_ID = 1;
const CLASS_CHAT = 2;
const DIRECT_CHAT = 1;
// the seed's second message in the class chat is Felix's
const FELIX_MESSAGE = 2;

describe("Chat rooms authorization (e2e)", () => {
  let app: INestApplication<App>;
  let anna: string;
  let felix: string;

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function login(username: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: username, password: "password123" })
      .expect(201);
    return (response.body as { token: string }).token;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);

    anna = await login(ANNA.username);
    felix = await login(FELIX.username);
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves the rooms only under /api/chat-rooms (T88)", async () => {
    await request(app.getHttpServer())
      .get("/api/chat/rooms")
      .set(as(felix))
      .expect(404);
    const response = await request(app.getHttpServer())
      .get("/api/chat-rooms")
      .set(as(felix))
      .expect(200);

    const ids = (response.body as { room_id: number }[]).map((r) => r.room_id);
    expect(ids).toEqual(expect.arrayContaining([DIRECT_CHAT, CLASS_CHAT]));
  });

  // THESIS: T02, decision Q14
  it("lets a member who isn't the creator add nobody (403)", async () => {
    await request(app.getHttpServer())
      .post(`/api/chat-rooms/${CLASS_CHAT}/members`)
      .set(as(felix))
      .send({ userId: ADMIN_ID })
      .expect(403);
  });

  it("lets the creator add a member", async () => {
    await request(app.getHttpServer())
      .post(`/api/chat-rooms/${CLASS_CHAT}/members`)
      .set(as(anna))
      .send({ userId: ADMIN_ID })
      .expect(201);
  });

  // THESIS: T114
  it("lets a member who isn't the creator remove nobody else (403)", async () => {
    await request(app.getHttpServer())
      .delete(`/api/chat-rooms/${CLASS_CHAT}/members/${LAURA_ID}`)
      .set(as(felix))
      .expect(403);
  });

  it("lets the creator remove a member", async () => {
    await request(app.getHttpServer())
      .delete(`/api/chat-rooms/${CLASS_CHAT}/members/${LAURA_ID}`)
      .set(as(anna))
      .expect(200);
  });

  // THESIS: T02 – deleting the room is creator-only and no longer shadowed by leave
  it("lets nobody but the creator delete a room (403)", async () => {
    await request(app.getHttpServer())
      .delete(`/api/chat-rooms/${DIRECT_CHAT}`)
      .set(as(felix))
      .expect(403);
  });

  // THESIS: T128, T96
  it("lets a member leave, then hides the room and its messages from them", async () => {
    await request(app.getHttpServer())
      .get(`/api/chat-rooms/${CLASS_CHAT}/messages`)
      .set(as(felix))
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/chat-rooms/${CLASS_CHAT}/members/${FELIX.id}`)
      .set(as(felix))
      .expect(200);

    const rooms = await request(app.getHttpServer())
      .get("/api/chat-rooms")
      .set(as(felix))
      .expect(200);
    expect(
      (rooms.body as { room_id: number }[]).map((r) => r.room_id),
    ).not.toContain(CLASS_CHAT);

    await request(app.getHttpServer())
      .get(`/api/chat-rooms/${CLASS_CHAT}/messages`)
      .set(as(felix))
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/chat-rooms/${CLASS_CHAT}`)
      .set(as(felix))
      .expect(403);
    // his own old message in that room can't be edited any more either
    await request(app.getHttpServer())
      .patch(`/api/chat-rooms/messages/${FELIX_MESSAGE}`)
      .set(as(felix))
      .send({ message: "edited after leaving" })
      .expect(403);
  });

  it("answers 400 for a non-numeric room id and has no listing of all messages", async () => {
    await request(app.getHttpServer())
      .get("/api/chat-rooms/messages")
      .set(as(anna))
      .expect(400);
  });
});
