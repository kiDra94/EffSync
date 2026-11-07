import { Injectable } from "@nestjs/common";
import {
  Notifier,
  type NotificationRequest,
} from "../../contexts/notifications/application";
import { NotificationsService } from "./notifications.service";

/** The notifications port on the legacy NotificationsService (M16, until M23). */
@Injectable()
export class NotifierAdapter extends Notifier {
  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async notify({ userId, type, text }: NotificationRequest): Promise<void> {
    await this.notifications.create({
      user_id: userId,
      type,
      text,
      is_read: false,
    });
  }
}
