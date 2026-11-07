import { Test, TestingModule } from "@nestjs/testing";
import { ChatMessagesController } from "./chat-messages.controller";
import { ChatMessagesService } from "./chat-messages.service";
import {
  JwtAuthGuard,
  PermissionsGuard,
} from "../../shared/presentation/security";

describe("ChatMessagesController", () => {
  let controller: ChatMessagesController;

  const mockChatMessagesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatMessagesController],
      providers: [
        {
          provide: ChatMessagesService,
          useValue: mockChatMessagesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatMessagesController>(ChatMessagesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
