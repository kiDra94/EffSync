import { ref, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '@/stores/entities/chatStore';


let socket= null;

export const useChat = () => {
    const chatStore = useChatStore();
    const isConnected = ref(false);
    const connectionError = ref(null);

    const connect = () => {
        if (!socket) {
            const token = localStorage.getItem('authToken');
            socket = io(import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || '', {
                auth: { token },
                transports: ['websocket'],
            });
        }

        isConnected.value = socket.connected;

        socket.off('connect').on('connect', () => {
            isConnected.value = true;
            connectionError.value = null;
        });

        socket.off('disconnect').on('disconnect', () => {
            isConnected.value = false;
        });

        socket.off('connect_error').on('connect_error', (err) => {
            connectionError.value = err.message;
        });

        socket.off('chat:new').on('chat:new', (message) => {
            chatStore.addIncomingMessage(message);
        });

        socket.off('chat:edited').on('chat:edited', (message) => {
            chatStore.updateMessageInStore(message);
        });

        socket.off('chat:deleted').on('chat:deleted', ({ messageId }) => {
            chatStore.removeMessageFromStore(messageId);
        });

        socket.off('error').on('error', (errorPayload) => {
            console.error('Chat WebSocket Error:', errorPayload.message);
        });
        
        // 3. NEU: roomId hinzugefügt
        socket.off('chat:typing').on('chat:typing', ({ roomId, userId, username }) => {
            chatStore.setUserTyping(roomId, userId, username);
        });
    };

    const disconnect = () => {
        if (socket) {
            socket.disconnect();
            socket = null;
            isConnected.value = false;
        }
    };

    const joinRoom = (roomId) => {
        socket?.emit('join:room', roomId);
    };

    const leaveRoom = (roomId) => {
        socket?.emit('leave:room', roomId);
    };

    const sendMessage = (roomId, message) => {
        if (!socket?.connected) return false;
        socket.emit('chat:send', { roomId, message });
        return true;
    };

    const editMessage = (messageId, newText) => {
        if (!socket?.connected) return false;
        socket.emit('chat:edit', { messageId, message: newText });
        return true;
    };

    const deleteMessage = (messageId) => {
        if (!socket?.connected) return false;
        socket.emit('chat:delete', { messageId });
        return true;
    };

    const sendTyping = (roomId) => {
        if (!socket?.connected) return;
        socket.emit('chat:typing', { roomId });
    };

    onUnmounted(() => {
        // kein Disconect, damit die Verbindung auch beim Navigieren zwischen Views erhalten bleibt
        if (!socket) return;
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('chat:new');
        socket.off('chat:edited');
        socket.off('chat:deleted');
        socket.off('error');
        socket.off('chat:typing');
    });

    return {
        isConnected,
        connectionError,
        connect,
        disconnect,
        joinRoom,
        leaveRoom,
        sendMessage,
        editMessage,
        deleteMessage,
        sendTyping
    };
};