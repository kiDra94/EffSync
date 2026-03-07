import { io } from 'socket.io-client';
import { ref } from 'vue';

const socket = ref(null);
const isConnected = ref(false);

export function useSocket() {
    function connect(token) {
        if(socket.value?.cinnected) return;

        socket.value = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
            auth: { token },
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 3000,
        });

        socket.value.on('connect', () => {
            isConnected.value = true;
            console.log('WebSocket connected!');
        });

        socket.value.on('disconnect', (reason) => {
            isConnected.value = false;
            console.warn('WebSocket disconnected', reason);
        });

        socket.value.on('connect_error', (error) => {
            isConnected.value = false;
            console.error('WebSocket connection error', error.message);
        });
    }

    function disconnect() {
        socket.value?.disconnect();
        socket.value = null;
        isConnected.value = false;
    }

    return {
        connect,
        isConnected,
        connect,
        disconnect,
    }
}