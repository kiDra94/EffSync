import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import type { RealtimePublisher } from "../../../shared/application/realtime";
import { PrismaNotificationRepository } from "../infrastructure/persistence/prisma-notification.repository";

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

  const realtime = { toUser: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      new PrismaNotificationRepository(
        new PrismaUnitOfWork(mockPrismaService as unknown as PrismaService),
      ),
      realtime as unknown as RealtimePublisher,
    );
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

  // M23: the in-app notification goes out live with the unchanged event name
  it("stores a notification and sends notification:new to the user", async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({ user_id: 4 });
    mockPrismaService.notifications.create.mockResolvedValue({
      notification_id: 1,
    });

    await service.create({ user_id: 4, type: "info", text: "Hallo" });

    expect(mockPrismaService.notifications.create).toHaveBeenCalledWith({
      data: { user_id: 4, type: "info", text: "Hallo" },
    });
    expect(realtime.toUser).toHaveBeenCalledWith(4, "notification:new", {
      notification_id: 1,
    });
  });

  it("answers 404 for an unknown user and for someone else's notification", async () => {
    mockPrismaService.users.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ user_id: 99, type: "info", text: "x" }),
    ).rejects.toThrow("User with ID 99 not found!");

    mockPrismaService.notifications.findUnique.mockResolvedValue({
      notification_id: 1,
      user_id: 4,
    });
    await expect(service.markAsRead(1, 5)).rejects.toThrow("not found");
    await expect(service.remove(1, 5)).rejects.toThrow("not found");
    expect(mockPrismaService.notifications.delete).not.toHaveBeenCalled();
  });
});
