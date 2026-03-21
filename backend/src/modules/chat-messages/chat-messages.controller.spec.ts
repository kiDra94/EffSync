import { Test, TestingModule } from "@nestjs/testing";
import { ChatMessagesController } from "./chat-messages.controller";
import { ChatMessagesService } from "./chat-messages.service";
import { PrismaService } from "src/prisma/prisma.service";

describe("ChatMessagesController", () => {
  let controller: ChatMessagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatMessagesController],
      providers: [
        ChatMessagesService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ChatMessagesController>(ChatMessagesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
