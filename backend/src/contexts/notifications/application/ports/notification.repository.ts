import type {
  NewNotification,
  NotificationRecord,
} from "./notification-records";

/** In-app notifications (port); the queries NotificationsService made before M23. */
export abstract class NotificationRepository {
  abstract userExists(userId: number): Promise<boolean>;
  abstract create(notification: NewNotification): Promise<NotificationRecord>;
  /** One page of the user's notifications, newest first, and their number (M37). */
  abstract findPageOf(
    userId: number,
    isRead: boolean | undefined,
    page: { skip: number; take: number },
  ): Promise<{ notifications: NotificationRecord[]; total: number }>;
  abstract findById(notificationId: number): Promise<NotificationRecord | null>;
  abstract markRead(notificationId: number): Promise<NotificationRecord>;
  /** The number of notifications marked. */
  abstract markAllRead(userId: number): Promise<number>;
  abstract countUnread(userId: number): Promise<number>;
  abstract delete(notificationId: number): Promise<void>;
}
