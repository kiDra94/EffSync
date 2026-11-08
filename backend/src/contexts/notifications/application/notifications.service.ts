import { Injectable, NotFoundException } from "@nestjs/common";
import { GHOST_USER_ID } from "../../identity-access/application";
import { RealtimePublisher } from "../../../shared/application/realtime";
import { NotificationRepository } from "./ports/notification.repository";
import type { NewNotification } from "./ports/notification-records";

/** A user's in-app notifications (T44, T72), live through notification:new. */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly realtime: RealtimePublisher,
  ) {}

  async create(input: NewNotification) {
    // the ghost user 0 (M14) is no one to notify, whoever asks (M16)
    if (input.user_id === GHOST_USER_ID) return null;
    if (!(await this.notifications.userExists(input.user_id))) {
      throw new NotFoundException(`User with ID ${input.user_id} not found!`);
    }
    const notification = await this.notifications.create(input);
    this.realtime.toUser(input.user_id, "notification:new", notification);
    return notification;
  }

  findAll(userId: number, isRead?: boolean) {
    return this.notifications.findAllOf(userId, isRead);
  }

  async findOne(notificationId: number) {
    const notification = await this.notifications.findById(notificationId);
    if (!notification) {
      throw new NotFoundException(
        `Notification wiht ID ${notificationId} not found!`,
      );
    }
    return notification;
  }

  /** The user's own notification; someone else's is a 404 (review M23). */
  async findOwn(notificationId: number, userId: number) {
    const notification = await this.findOne(notificationId);
    if (notification.user_id !== userId) {
      throw new NotFoundException("Notification not found!");
    }
    return notification;
  }

  async markAsRead(notificationId: number, userId: number) {
    await this.findOwn(notificationId, userId);
    return this.notifications.markRead(notificationId);
  }

  async markManyAsRead(userId: number) {
    const count = await this.notifications.markAllRead(userId);
    return { message: `${count} notifications marked as read!` };
  }

  async getUnreadCount(userId: number) {
    return { unread_count: await this.notifications.countUnread(userId) };
  }

  async remove(notificationId: number, userId: number) {
    await this.findOwn(notificationId, userId);
    await this.notifications.delete(notificationId);
    return {
      message: "Notification was successfully deleted!",
      notification_id: notificationId,
    };
  }
}
