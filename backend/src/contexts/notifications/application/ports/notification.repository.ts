import type {
  NewNotification,
  NotificationRecord,
} from "./notification-records";

/** In-app notifications (port); the queries NotificationsService made before M23. */
export abstract class NotificationRepository {
  abstract userExists(userId: number): Promise<boolean>;
  abstract create(notification: NewNotification): Promise<NotificationRecord>;
  abstract findAllOf(
    userId: number,
    isRead: boolean | undefined,
  ): Promise<NotificationRecord[]>;
  abstract findById(notificationId: number): Promise<NotificationRecord | null>;
  abstract markRead(notificationId: number): Promise<NotificationRecord>;
  /** The number of notifications marked. */
  abstract markAllRead(userId: number): Promise<number>;
  abstract countUnread(userId: number): Promise<number>;
  abstract delete(notificationId: number): Promise<void>;
}
