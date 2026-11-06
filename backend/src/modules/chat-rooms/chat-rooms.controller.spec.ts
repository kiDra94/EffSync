import { Test, TestingModule } from "@nestjs/testing";
import { ChatRoomsController } from "./chat-rooms.controller";
import { ChatRoomsService } from "./chat-rooms.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { WebsocketGateway } from "../websocket/websocket.gateway";

describe("ChatRoomsController", () => {
  let controller: ChatRoomsController;

  const mockChatRoomsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatRoomsController],
      providers: [
        { provide: WebsocketGateway, useValue: {} },
        {
          provide: ChatRoomsService,
          useValue: mockChatRoomsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatRoomsController>(ChatRoomsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
