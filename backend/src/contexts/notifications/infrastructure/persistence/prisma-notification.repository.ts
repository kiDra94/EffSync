import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { NotificationRepository } from "../../application/ports/notification.repository";
import type { NewNotification } from "../../application/ports/notification-records";

/** Notifications on Prisma: the queries NotificationsService made before M23. */
@Injectable()
export class PrismaNotificationRepository extends NotificationRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  async userExists(userId: number) {
    return !!(await this.db.users.findUnique({ where: { user_id: userId } }));
  }

  create(notification: NewNotification) {
    return this.db.notifications.create({ data: { ...notification } });
  }

  findAllOf(userId: number, isRead: boolean | undefined) {
    return this.db.notifications.findMany({
      where: { user_id: userId, is_read: isRead },
      orderBy: { created_at: "desc" },
    });
  }

  findById(notificationId: number) {
    return this.db.notifications.findUnique({
      where: { notification_id: notificationId },
    });
  }

  markRead(notificationId: number) {
    return this.db.notifications.update({
      where: { notification_id: notificationId },
      data: { is_read: true },
    });
  }

  async markAllRead(userId: number) {
    const { count } = await this.db.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
    return count;
  }

  countUnread(userId: number) {
    return this.db.notifications.count({
      where: { user_id: userId, is_read: false },
    });
  }

  async delete(notificationId: number) {
    await this.db.notifications.delete({
      where: { notification_id: notificationId },
    });
  }
}
