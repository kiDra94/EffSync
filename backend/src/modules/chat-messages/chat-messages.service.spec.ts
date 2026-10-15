import { Test, TestingModule } from "@nestjs/testing";
import { ChatMessagesService } from "./chat-messages.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("ChatMessagesService", () => {
  let service: ChatMessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatMessagesService,
        { provide: PrismaService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    service = module.get<ChatMessagesService>(ChatMessagesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
