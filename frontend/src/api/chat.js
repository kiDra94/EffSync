import { apiClient } from '@/api/httpClient';
import { normalizeEntity, normalizeEntities } from '@/config/api.config';

const ROOMS_ENDPOINT = '/chat/rooms';
const MESSAGES_ENDPOINT = (roomId) => `/chat/rooms/${roomId}/messages`;
const ID_KEY = 'room_id';
const MSG_ID_KEY = 'message_id';

export const fetchRooms = async () => {
    const response = await apiClient.get(ROOMS_ENDPOINT);
    const rooms = response.data?.data ?? response.data;
    return normalizeEntities(rooms, ID_KEY);
};

export const fetchRoomById = async (roomId) => {
    const response = await apiClient.get(`${ROOMS_ENDPOINT}/${roomId}`);
    return normalizeEntity(response.data, ID_KEY);
};

export const fetchMessages = async (roomId) => {
    const response = await apiClient.get(MESSAGES_ENDPOINT(roomId));
    const messages = response.data?.data ?? response.data;
    return normalizeEntities(messages, MSG_ID_KEY);
};

export const createRoom = async (roomData) => {
    const response = await apiClient.post(ROOMS_ENDPOINT, roomData);
    return normalizeEntity(response.data, ID_KEY);
};

export const sendMessageRest = async (roomId, content) => {
    const response = await apiClient.post(MESSAGES_ENDPOINT(roomId), { content });
    return normalizeEntity(response.data, MSG_ID_KEY);
};

export const editMessage = async (messageId, content) => {
    const response = await apiClient.patch(`/chat/messages/${messageId}`, { content });
    return normalizeEntity(response.data, MSG_ID_KEY);
};

export const deleteMessage = async (messageId) => {
    const response = await apiClient.delete(`/chat/messages/${messageId}`);
    return response.data;
};

export const addMember = async (roomId, userId) => {
    const response = await apiClient.post(`${ROOMS_ENDPOINT}/${roomId}/members`, { userId });
    return response.data;
};
