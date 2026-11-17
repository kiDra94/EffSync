import { Injectable } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { Notifier, type NotificationRequest } from "./notifier";

/** The Notifier port on the in-app notifications (M16, in the context since M23). */
@Injectable()
export class InAppNotifier extends Notifier {
  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async notify({ userId, type, text }: NotificationRequest): Promise<void> {
    await this.notifications.create({ user_id: userId, type, text });
  }
}
