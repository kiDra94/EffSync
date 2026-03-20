import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateChatRoomDto } from "./dto/create-chat-room.dto";
import { UpdateChatRoomDto } from "./dto/update-chat-room.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ChatRoomsService {
    constructor(private readonly prisma: PrismaService) { }

    async createRoom(createChatRoomDto: CreateChatRoomDto, userId: number) {
        return await this.prisma.chat_rooms.create({
            data: {
                name: createChatRoomDto.name,
                task_id: createChatRoomDto.task_id,
                class_id: createChatRoomDto.class_id,
                is_private: createChatRoomDto.is_private ?? false,
                direct_chat_hash: createChatRoomDto.direct_chat_hash,
                created_by: userId,
                chat_room_users: {
                    create: {
                        user_id: userId,
                    },
                },
            },
        });
    }

    async findRoomsByUser(userId: number) {
        console.log('🔍 findRoomsByUser aufgerufen mit userId:', userId);
        
        // ✅ Direkt die Räume mit JOIN holen, nicht nur chat_room_users
        const rooms = await this.prisma.chat_rooms.findMany({
            where: {
                chat_room_users: {
                    some: { user_id: userId }
                }
            },
            include: {
                chat_room_users: {
                    select: {
                        user_id: true,
                        joined_at: true,
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        
        console.log('✅ Räume gefunden:', rooms);
        return rooms;
    }
    

    async findOne(roomId: number) {
        return this.prisma.chat_rooms.findUnique({
            where: { room_id: roomId }
        });
    }

    async updateRoom(roomId: number, updateData: { name?: string }) {
        return this.prisma.chat_rooms.update({
            where: { room_id: roomId },
            data: updateData,
        });
    }

    async deleteRoom(roomId: number) {
        return this.prisma.$transaction(async (trans) => {
            await trans.chat_room_users.deleteMany({
                where: { room_id: roomId },
            });
            await trans.chat_messages.deleteMany({
                where: { room_id: roomId },
            });
            return trans.chat_rooms.delete({
                where: { room_id: roomId },
            });
        });
    }

    async joinRoom(roomId: number, userId: number) {
        return this.prisma.$transaction(async (trans) => {
            const room = await trans.chat_rooms.findUnique({
                where: { room_id: roomId },
            });
            if (!room) throw new NotFoundException('Room does not exist!');

            const isInRoom = await trans.chat_room_users.findFirst({
                where: {
                    room_id: roomId,
                    user_id: userId,
                    left_at: null,
                },
            });
            if (isInRoom) return isInRoom;

            return trans.chat_room_users.create({
                data: {
                    room_id: roomId,
                    user_id: userId,
                },
            });
        });
    }

    async leaveRoom(roomId: number, userId: number) {
        return this.prisma.$transaction(async (trans) => {
            const isInRoom = await trans.chat_room_users.findFirst({
                where: {
                    room_id: roomId,
                    user_id: userId,
                    left_at: null,
                },
            });
            if (!isInRoom) throw new NotFoundException('User is not an active member of this room!');

            return trans.chat_room_users.update({
                where: {
                    room_id_user_id_joined_at: {
                        room_id: isInRoom.room_id,
                        user_id: isInRoom.user_id,
                        joined_at: isInRoom.joined_at,
                    },
                },
                data: { left_at: new Date() },
            });
        });
    }

    async assertIsCreator(roomId: number, userId: number) {
        const room = await this.prisma.chat_rooms.findUnique({
            where: { room_id: roomId },
            select: { created_by: true },
        });
        if (!room) throw new NotFoundException('Room not found!');
        if (room.created_by !== userId)
            throw new ForbiddenException('Only the room creator can do this!');
    }
    
}
