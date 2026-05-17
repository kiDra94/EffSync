import { Injectable, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { WebsocketGateway } from "../websocket/websocket.gateway";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WebsocketGateway))
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: createNotificationDto.user_id}
    });
    if(!user) {
      throw new NotFoundException (`User with ID ${createNotificationDto.user_id} not found!`)
    }

    const notification = await this.prisma.notifications.create({
      data: { ...createNotificationDto },
    });
    this.websocketGateway.emitToUser(
      createNotificationDto.user_id,
      'notification:new',
      notification,
    )
    
    return notification;
  }

  async findAll(userId: number, isRead?: boolean) {
    return await this.prisma.notifications.findMany({
      where: {
        user_id: userId,
        is_read: isRead,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(notificationId: number) {
    const notification = await this.prisma.notifications.findUnique({
      where: { notification_id: notificationId }
    });
    if(!notification) {
      throw new NotFoundException(`Notification wiht ID ${notificationId} not found!`)
    }
    return notification;
  }

  async markAsRead(notificationId: number, userId: number) {
    const notification = await this.findOne(notificationId);
    if(notification.user_id !== userId) {
      throw new NotFoundException('Notification not found!')
    }
    return await this.prisma.notifications.update({
      where: { notification_id: notificationId},
      data: { is_read: true},
    });
  }

  async markManyAsRead(userId: number) {
    const notifications = await this.prisma.notifications.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });
    return { message: `${notifications.count} notifications marked as read!`}
  }

  async getUnreadCount(userId: number) {
    const unreadCount = await this.prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    return { unread_count: unreadCount };
  }

  async getReadCount(userId: number) {
    const getReadCount = await this.prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: true,
      },
    });

    return { unread_count: getReadCount };
  }

  async remove(notificationId: number, userId: number) {
    const notification = await this.findOne(notificationId);
    if (notification.user_id !== userId) {
      throw new NotFoundException('Notification not found');
    }
    await this.prisma.notifications.delete({
      where: { notification_id: notificationId },
    });

    return { message: 'Notification was successfully deleted!', notification_id: notificationId }
  }
}
