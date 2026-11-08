import { Test, TestingModule } from "@nestjs/testing";
import { ChatRoomsController } from "./chat-rooms.controller";
import { ChatRoomsService } from "../application/chat-rooms.service";
import {
  JwtAuthGuard,
  PermissionsGuard,
} from "../../../shared/presentation/security";
import { ChatRealtime } from "../application/chat-realtime";

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
        { provide: ChatRealtime, useValue: {} },
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
