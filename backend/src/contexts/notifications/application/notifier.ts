/** A notification for one user (T44, T72). */
export interface NotificationRequest {
  userId: number;
  type: string;
  text: string;
}

/**
 * The notifications context's application port (GOALS.md M16): other
 * contexts notify users only through it. InAppNotifier implements it (M23).
 */
export abstract class Notifier {
  abstract notify(request: NotificationRequest): Promise<void>;
}
