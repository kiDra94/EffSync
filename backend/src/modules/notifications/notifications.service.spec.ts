import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { WebsocketGateway } from "../websocket/websocket.gateway";

describe("NotificationsService", () => {
  let service: NotificationsService;

  const mockPrismaService = {
    users: { findUnique: jest.fn() },
    notifications: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WebsocketGateway, useValue: { emitToUser: jest.fn() } },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // M16 step 6: the ghost user 0 (M14) is no one to notify, whoever asks
  it("creates no notification for the ghost user", async () => {
    await expect(
      service.create({ user_id: 0, type: "info", text: "x" }),
    ).resolves.toBeNull();
    expect(mockPrismaService.users.findUnique).not.toHaveBeenCalled();
    expect(mockPrismaService.notifications.create).not.toHaveBeenCalled();
  });
});
