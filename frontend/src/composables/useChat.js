import { onUnmounted } from 'vue';
import { useSocket } from '@/stores/useSocket';
import { useChatStore } from '@/stores/entities/chatStore';
import { sendMessageRest } from '@/api/chat';

export const useChat = () => {
    const chatStore = useChatStore();
    const { socket, isConnected, connect: socketConnect, disconnect: socketDisconnect, socket_on, socket_off, socket_emit } = useSocket();

    const connect = () => {
        const token = localStorage.getItem('authToken');
        socketConnect(token);

        socket_off('chat:new');
        socket_on('chat:new', (message) => {
            if (!message.users) {
                const room = chatStore.rooms.find(r =>
                    (r.room_id ?? r.id) === (message.room_id ?? message.roomId)
                );
                const member = room?.chat_room_users?.find(u => u.user_id === message.user_id);
                if (member?.users) message.users = member.users;
            }
            chatStore.addIncomingMessage(message);
        });

        socket_off('chat:edited');
        socket_on('chat:edited', (message) => {
            if (!message.users) {
                const room = chatStore.rooms.find(r =>
                    (r.room_id ?? r.id) === (message.room_id ?? message.roomId)
                );
                const member = room?.chat_room_users?.find(u => u.user_id === message.user_id);
                if (member?.users) message.users = member.users;
            }
            chatStore.updateMessageInStore(message);
        });

        socket_off('chat:deleted');
        socket_on('chat:deleted', ({ messageId }) => {
            chatStore.removeMessageFromStore(messageId);
        });

        socket_off('chat:typing');
        socket_on('chat:typing', ({ roomId, userId, username }) => {
            chatStore.setUserTyping(roomId, userId, username);
        });

        socket_off('room:new');
        socket_on('room:new', async ({ roomId }) => {
            await chatStore.getRooms();
            socket_emit('join:room', roomId);
        });

        socket_off('error');
        socket_on('error', (errorPayload) => {
            console.error('Chat WebSocket Error:', errorPayload.message);
        });
    };

    const joinRoom = (roomId) => socket_emit('join:room', roomId);
    const leaveRoom = (roomId) => socket_emit('leave:room', roomId);
    const inviteToRoom = (roomId, userId) => socket_emit('invite:room', { roomId, userId });
    const editMessage = (messageId, newText) => socket_emit('chat:edit', { messageId, message: newText });
    const deleteMessage = (messageId) => socket_emit('chat:delete', { messageId });
    const sendTyping = (roomId) => socket_emit('chat:typing', { roomId });

    const sendMessage = async (roomId, message) => {
        if (socket.value?.connected) {
            socket_emit('chat:send', { roomId, message });
            return true;
        }
        try {
            await sendMessageRest(roomId, message);
            await chatStore.selectRoom(roomId);
            return true;
        } catch (error) {
            console.error('Nachricht senden fehlgeschlagen:', error);
            return false;
        }
    };

    onUnmounted(() => {
        socket_off('chat:new');
        socket_off('chat:edited');
        socket_off('chat:deleted');
        socket_off('chat:typing');
        socket_off('room:new');
        socket_off('error');
    });

    return {
        isConnected,
        connect,
        disconnect: socketDisconnect,
        joinRoom,
        leaveRoom,
        sendMessage,
        editMessage,
        deleteMessage,
        sendTyping,
        inviteToRoom,
    };
};