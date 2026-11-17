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

  async findPageOf(
    userId: number,
    isRead: boolean | undefined,
    page: { skip: number; take: number },
  ) {
    const where = { user_id: userId, is_read: isRead };
    const [notifications, total] = await Promise.all([
      this.db.notifications.findMany({
        where,
        // the id breaks ties, so equal times keep their page
        orderBy: [{ created_at: "desc" }, { notification_id: "desc" }],
        skip: page.skip,
        take: page.take,
      }),
      this.db.notifications.count({ where }),
    ]);
    return { notifications, total };
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
