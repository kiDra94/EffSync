import { Global, Module } from "@nestjs/common";
import { Notifier } from "../../contexts/notifications/application";
import { NotificationsModule } from "./notifications.module";
import { NotifierAdapter } from "./notifier.adapter";

/**
 * Binds the notifications context's Notifier port to the legacy
 * NotificationsService (M16). Global, like EmailPortsModule; M23 replaces it
 * with the migrated context.
 */
@Global()
@Module({
  imports: [NotificationsModule],
  providers: [{ provide: Notifier, useClass: NotifierAdapter }],
  exports: [Notifier],
})
export class NotificationPortsModule {}
