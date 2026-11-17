/**
 * Route tests for the chat rooms (GOALS.md M2, flipped in M6).
 *
 * They go through real HTTP routing, because the M2 problems were in the
 * routing itself: two handlers shared `DELETE /:id`, and membership routes
 * took the target user from the request body without any check (T02, T114).
 * Since M6 the prefix is `/chat-rooms` (T88), membership changes need the
 * creator (decision Q14), and only members can read a room (T96).
 */
import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { ChatRoomsController } from "./chat-rooms.controller";
import { ChatRoomsService } from "../application/chat-rooms.service";
import {
  JwtAuthGuard,
  PermissionsGuard,
} from "../../../shared/presentation/security";
import { ChatRealtime } from "../application/chat-realtime";

const REQUESTER = 5;

describe("ChatRoomsController routes", () => {
  let app: INestApplication<App>;
  let rooms: Record<string, jest.Mock>;
  let gateway: {
    unsubscribeUserFromRoom: jest.Mock;
    subscribeUsersToRoom: jest.Mock;
  };

  beforeEach(async () => {
    rooms = {
      createRoom: jest.fn().mockResolvedValue({ room_id: 1 }),
      findRoomsByUser: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ room_id: 1 }),
      joinRoom: jest.fn().mockResolvedValue({ room_id: 1 }),
      leaveRoom: jest.fn().mockResolvedValue({ room_id: 1 }),
      updateRoom: jest.fn().mockResolvedValue({ room_id: 1 }),
      deleteRoom: jest.fn().mockResolvedValue({ room_id: 1 }),
      assertIsCreator: jest.fn().mockResolvedValue(undefined),
      assertIsMember: jest.fn().mockResolvedValue(undefined),
    };

    gateway = {
      unsubscribeUserFromRoom: jest.fn(),
      subscribeUsersToRoom: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ChatRoomsController],
      providers: [
        { provide: ChatRoomsService, useValue: rooms },
        { provide: ChatRealtime, useValue: gateway },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<{ user?: unknown }>();
          // only the field the controller reads; PermissionsGuard (which reads `id`) is overridden
          req.user = { userId: REQUESTER };
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    // same global pipe as main.ts, so the routes behave as in production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const forbidden = () =>
    rooms.assertIsCreator.mockRejectedValueOnce(
      new ForbiddenException("Only the room creator can do this!"),
    );

  it("serves no route under the old /chat/rooms prefix (T88)", async () => {
    await request(app.getHttpServer()).get("/chat/rooms").expect(404);
  });

  // THESIS: T02 (flipped in M6) – the REST self-join is gone
  it("has no POST /:id self-join any more", async () => {
    await request(app.getHttpServer())
      .post("/chat-rooms/1")
      .send({ userId: 9 })
      .expect(404);

    expect(rooms.joinRoom).not.toHaveBeenCalled();
  });

  // THESIS: T02 (flipped in M6), decision Q14 – only the creator adds members
  it("POST /:id/members adds the user when the requester is the creator", async () => {
    await request(app.getHttpServer())
      .post("/chat-rooms/1/members")
      .send({ userId: 9 })
      .expect(201);

    expect(rooms.assertIsCreator).toHaveBeenCalledWith(1, REQUESTER);
    expect(rooms.joinRoom).toHaveBeenCalledWith(1, 9);
    // M21 (open item (9) of M20): the added user gets the room live
    expect(gateway.subscribeUsersToRoom).toHaveBeenCalledWith([9], 1);
  });

  it("POST /:id/members answers 403 for anyone but the creator and adds nobody", async () => {
    forbidden();
    await request(app.getHttpServer())
      .post("/chat-rooms/1/members")
      .send({ userId: 9 })
      .expect(403);

    expect(rooms.joinRoom).not.toHaveBeenCalled();
  });

  it("POST /:id/members validates the body", async () => {
    await request(app.getHttpServer())
      .post("/chat-rooms/1/members")
      .send({ userId: "abc" })
      .expect(400);

    expect(rooms.joinRoom).not.toHaveBeenCalled();
  });

  // THESIS: T02, T114 (flipped in M6) – DELETE /:id deletes the room; deleteRoom checks the creator
  it("DELETE /:id deletes the room for the requester and never touches memberships", async () => {
    await request(app.getHttpServer())
      .delete("/chat-rooms/1")
      .send({ userId: 9 })
      .expect(200);

    expect(rooms.deleteRoom).toHaveBeenCalledWith(1, REQUESTER);
    expect(rooms.leaveRoom).not.toHaveBeenCalled();
  });

  it("DELETE /:id answers 403 for anyone but the creator", async () => {
    rooms.deleteRoom.mockRejectedValueOnce(
      new ForbiddenException("Only the creator can delete this room"),
    );
    await request(app.getHttpServer()).delete("/chat-rooms/1").expect(403);
  });

  it("answers 400 for a non-numeric room id instead of reaching the database", async () => {
    await request(app.getHttpServer()).get("/chat-rooms/messages").expect(400);
    await request(app.getHttpServer()).delete("/chat-rooms/abc").expect(400);

    expect(rooms.assertIsMember).not.toHaveBeenCalled();
    expect(rooms.deleteRoom).not.toHaveBeenCalled();
  });

  it("DELETE /:id/members/:userId lets a member leave without the creator check", async () => {
    await request(app.getHttpServer())
      .delete(`/chat-rooms/1/members/${REQUESTER}`)
      .expect(200);

    expect(rooms.assertIsCreator).not.toHaveBeenCalled();
    expect(rooms.leaveRoom).toHaveBeenCalledWith(1, REQUESTER);
    expect(gateway.unsubscribeUserFromRoom).toHaveBeenCalledWith(REQUESTER, 1);
  });

  it("DELETE /:id/members/:userId requires the creator to remove someone else (T114)", async () => {
    await request(app.getHttpServer())
      .delete("/chat-rooms/1/members/9")
      .expect(200);
    expect(rooms.assertIsCreator).toHaveBeenCalledWith(1, REQUESTER);
    // the removed user stops receiving the room's live messages
    expect(gateway.unsubscribeUserFromRoom).toHaveBeenCalledWith(9, 1);

    forbidden();
    await request(app.getHttpServer())
      .delete("/chat-rooms/1/members/9")
      .expect(403);
    expect(rooms.leaveRoom).toHaveBeenCalledTimes(1);
  });

  it("creates rooms and lists rooms for the authenticated user", async () => {
    await request(app.getHttpServer())
      .post("/chat-rooms")
      .send({ name: "Klasse" })
      .expect(201);
    await request(app.getHttpServer()).get("/chat-rooms").expect(200);

    expect(rooms.createRoom).toHaveBeenCalledWith(
      { name: "Klasse" },
      REQUESTER,
    );
    expect(rooms.findRoomsByUser).toHaveBeenCalledWith(REQUESTER);
  });

  // T96: object-level check through chat_room_users
  it("GET /:id returns the room only to a member", async () => {
    await request(app.getHttpServer()).get("/chat-rooms/1").expect(200);
    expect(rooms.assertIsMember).toHaveBeenCalledWith(1, REQUESTER);
    expect(rooms.findOne).toHaveBeenCalledWith(1);

    rooms.assertIsMember.mockRejectedValueOnce(
      new ForbiddenException("You are not a member of this room!"),
    );
    await request(app.getHttpServer()).get("/chat-rooms/1").expect(403);
    expect(rooms.findOne).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown fields in a room body with 400, as main.ts's ValidationPipe does", async () => {
    await request(app.getHttpServer())
      .patch("/chat-rooms/1")
      .send({ name: "Neu", created_by: 1 })
      .expect(400);

    expect(rooms.updateRoom).not.toHaveBeenCalled();
  });

  it("PATCH /:id renames a room only for the creator", async () => {
    await request(app.getHttpServer())
      .patch("/chat-rooms/1")
      .send({ name: "Neu" })
      .expect(200);
    expect(rooms.assertIsCreator).toHaveBeenCalledWith(1, REQUESTER);
    expect(rooms.updateRoom).toHaveBeenCalledWith(1, { name: "Neu" });

    forbidden();
    await request(app.getHttpServer())
      .patch("/chat-rooms/1")
      .send({ name: "Neu" })
      .expect(403);
    expect(rooms.updateRoom).toHaveBeenCalledTimes(1);
  });
});
