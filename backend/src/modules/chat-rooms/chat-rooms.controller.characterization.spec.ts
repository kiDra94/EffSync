/**
 * Characterization tests for the chat-room routes (GOALS.md M2).
 *
 * They go through real HTTP routing, because the problem is the routing
 * itself: two handlers share `DELETE /:id`, and membership routes take the
 * target user from the request body without any check. All of this
 * contradicts T02 and gets flipped in M6.
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
import { ChatRoomsService } from "./chat-rooms.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";

const REQUESTER = 5;

describe("ChatRoomsController routes (characterization, M2)", () => {
  let app: INestApplication<App>;
  let rooms: Record<string, jest.Mock>;

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
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ChatRoomsController],
      providers: [{ provide: ChatRoomsService, useValue: rooms }],
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

  // THESIS: T02 – any user can add any other user to any room
  it("POST /:id adds the user named in the body, without any check", async () => {
    await request(app.getHttpServer())
      .post("/chat/rooms/1")
      .send({ userId: 9 })
      .expect(201);

    expect(rooms.joinRoom).toHaveBeenCalledWith(1, 9);
    expect(rooms.assertIsCreator).not.toHaveBeenCalled();
  });

  // THESIS: T02
  it("POST /:id/members adds the user named in the body, without any check", async () => {
    await request(app.getHttpServer())
      .post("/chat/rooms/1/members")
      .send({ userId: "9" })
      .expect(201);

    expect(rooms.joinRoom).toHaveBeenCalledWith(1, 9);
    expect(rooms.assertIsCreator).not.toHaveBeenCalled();
  });

  // THESIS: T02, T114 – DELETE /:id reaches leaveRoom, removes the user named in the body,
  // and the creator-checked deleteRoom on the same route is never reached
  it("DELETE /:id removes the user named in the body and never deletes the room", async () => {
    await request(app.getHttpServer())
      .delete("/chat/rooms/1")
      .send({ userId: 9 })
      .expect(200);

    expect(rooms.leaveRoom).toHaveBeenCalledWith(1, 9);
    expect(rooms.assertIsCreator).not.toHaveBeenCalled();
    expect(rooms.deleteRoom).not.toHaveBeenCalled();
  });

  it("DELETE /:id/members/:userId lets a member remove themselves without the creator check", async () => {
    await request(app.getHttpServer())
      .delete(`/chat/rooms/1/members/${REQUESTER}`)
      .expect(200);

    expect(rooms.assertIsCreator).not.toHaveBeenCalled();
    expect(rooms.leaveRoom).toHaveBeenCalledWith(1, REQUESTER);
  });

  it("DELETE /:id/members/:userId requires the creator to remove someone else (T114)", async () => {
    await request(app.getHttpServer())
      .delete("/chat/rooms/1/members/9")
      .expect(200);
    expect(rooms.assertIsCreator).toHaveBeenCalledWith(1, REQUESTER);

    rooms.assertIsCreator.mockRejectedValueOnce(
      new ForbiddenException("Only the room creator can do this!"),
    );
    await request(app.getHttpServer())
      .delete("/chat/rooms/1/members/9")
      .expect(403);
    expect(rooms.leaveRoom).toHaveBeenCalledTimes(1);
  });

  it("creates rooms and lists rooms for the authenticated user", async () => {
    await request(app.getHttpServer())
      .post("/chat/rooms")
      .send({ name: "Klasse" })
      .expect(201);
    await request(app.getHttpServer()).get("/chat/rooms").expect(200);
    await request(app.getHttpServer()).get("/chat/rooms/1").expect(200);

    expect(rooms.createRoom).toHaveBeenCalledWith(
      { name: "Klasse" },
      REQUESTER,
    );
    expect(rooms.findRoomsByUser).toHaveBeenCalledWith(REQUESTER);
    expect(rooms.findOne).toHaveBeenCalledWith(1);
  });

  it("rejects unknown fields in a room body with 400, as main.ts's ValidationPipe does", async () => {
    await request(app.getHttpServer())
      .patch("/chat/rooms/1")
      .send({ name: "Neu", created_by: 1 })
      .expect(400);

    expect(rooms.updateRoom).not.toHaveBeenCalled();
  });

  it("PATCH /:id renames a room without any creator check", async () => {
    await request(app.getHttpServer())
      .patch("/chat/rooms/1")
      .send({ name: "Neu" })
      .expect(200);

    expect(rooms.updateRoom).toHaveBeenCalledWith(1, { name: "Neu" });
    expect(rooms.assertIsCreator).not.toHaveBeenCalled();
  });
});
