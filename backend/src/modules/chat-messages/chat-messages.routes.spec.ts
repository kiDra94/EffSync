/**
 * Route tests for chat messages (GOALS.md M6): the routes live under
 * `/chat-rooms` (T88), and the catch-all `GET /chat` that returned every
 * message of every room is gone (T96).
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
import { ChatMessagesController } from "./chat-messages.controller";
import { ChatMessagesService } from "./chat-messages.service";
import {
  JwtAuthGuard,
  PermissionsGuard,
} from "../../shared/presentation/security";

const REQUESTER = 5;

describe("ChatMessagesController routes", () => {
  let app: INestApplication<App>;
  let messages: Record<string, jest.Mock>;

  beforeEach(async () => {
    messages = {
      createMsg: jest.fn().mockResolvedValue({ message_id: 1 }),
      findByRoom: jest.fn().mockResolvedValue([]),
      assertCanModify: jest.fn().mockResolvedValue({ message_id: 7 }),
      updateMsg: jest.fn().mockResolvedValue({ message_id: 1 }),
      deleteMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
      findAll: jest.fn().mockResolvedValue([]),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ChatMessagesController],
      providers: [{ provide: ChatMessagesService, useValue: messages }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ user?: unknown }>().user = {
            userId: REQUESTER,
          };
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
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

  it("serves no route under the old /chat prefix (T88)", async () => {
    await request(app.getHttpServer()).get("/chat").expect(404);
    await request(app.getHttpServer())
      .get("/chat/rooms/1/messages")
      .expect(404);
  });

  it("has no catch-all listing of every message (T96)", async () => {
    // in the full app GET /chat-rooms/messages falls through to GET /chat-rooms/:id,
    // whose ParseIntPipe answers 400 (chat-rooms.controller.characterization.spec.ts)
    await request(app.getHttpServer()).get("/chat-rooms/messages").expect(404);
    expect(messages.findAll).not.toHaveBeenCalled();
  });

  it("edits and deletes only after the author-and-member check", async () => {
    messages.assertCanModify.mockRejectedValue(new ForbiddenException());

    await request(app.getHttpServer())
      .patch("/chat-rooms/messages/7")
      .send({ message: "x" })
      .expect(403);
    await request(app.getHttpServer())
      .delete("/chat-rooms/messages/7")
      .expect(403);

    expect(messages.updateMsg).not.toHaveBeenCalled();
    expect(messages.deleteMessage).not.toHaveBeenCalled();
  });

  it("reads a room's messages for the requester, so the service can check membership", async () => {
    await request(app.getHttpServer())
      .get("/chat-rooms/2/messages")
      .expect(200);
    expect(messages.findByRoom).toHaveBeenCalledWith(2, REQUESTER);

    messages.findByRoom.mockRejectedValueOnce(new ForbiddenException());
    await request(app.getHttpServer())
      .get("/chat-rooms/2/messages")
      .expect(403);
  });

  it("sends, edits and deletes messages under /chat-rooms", async () => {
    await request(app.getHttpServer())
      .post("/chat-rooms/2/messages")
      .send({ message: "Hallo" })
      .expect(201);
    expect(messages.createMsg).toHaveBeenCalledWith(
      expect.objectContaining({
        room_id: 2,
        user_id: REQUESTER,
        message: "Hallo",
      }),
    );

    await request(app.getHttpServer())
      .patch("/chat-rooms/messages/7")
      .send({ message: "Neu" })
      .expect(200);
    expect(messages.assertCanModify).toHaveBeenCalledWith(7, REQUESTER);
    expect(messages.updateMsg).toHaveBeenCalledWith(7, "Neu");

    await request(app.getHttpServer())
      .delete("/chat-rooms/messages/7")
      .expect(200);
    expect(messages.deleteMessage).toHaveBeenCalledWith(7);
  });
});
