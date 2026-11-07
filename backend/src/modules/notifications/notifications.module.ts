import { Module, forwardRef } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { WebsocketModule } from "../websocket/websocket.module";

@Module({
  imports: [PrismaModule, forwardRef(() => WebsocketModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
