import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchRooms,
  fetchMessages,
  createRoom,
  sendMessageRest,
  editMessage,
  deleteMessage,
  addMember,
} from './chat';
import { apiClient } from './httpClient';

vi.mock('./httpClient');

// GOALS.md M6 (T88): the chat routes moved from /chat/rooms and /chat/messages to /chat-rooms
describe('chat api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get = vi.fn().mockResolvedValue({ data: [] });
    apiClient.post = vi.fn().mockResolvedValue({ data: {} });
    apiClient.patch = vi.fn().mockResolvedValue({ data: {} });
    apiClient.delete = vi.fn().mockResolvedValue({ data: {} });
  });

  it('reads and creates rooms under /chat-rooms', async () => {
    await fetchRooms();
    await createRoom({ name: 'Gruppe' });

    expect(apiClient.get).toHaveBeenCalledWith('/chat-rooms');
    expect(apiClient.post).toHaveBeenCalledWith('/chat-rooms', { name: 'Gruppe' });
  });

  it('reads and sends messages under /chat-rooms/:id/messages', async () => {
    await fetchMessages(2);
    await sendMessageRest(2, 'Hallo');

    expect(apiClient.get).toHaveBeenCalledWith('/chat-rooms/2/messages');
    expect(apiClient.post).toHaveBeenCalledWith('/chat-rooms/2/messages', { message: 'Hallo' });
  });

  it('edits and deletes messages under /chat-rooms/messages/:id', async () => {
    await editMessage(7, 'Neu');
    await deleteMessage(7);

    // the backend's UpdateChatMessageDto expects `message`; `content` was rejected with 400
    expect(apiClient.patch).toHaveBeenCalledWith('/chat-rooms/messages/7', { message: 'Neu' });
    expect(apiClient.delete).toHaveBeenCalledWith('/chat-rooms/messages/7');
  });

  it('adds a member under /chat-rooms/:id/members', async () => {
    await addMember(2, 9);

    expect(apiClient.post).toHaveBeenCalledWith('/chat-rooms/2/members', { userId: 9 });
  });
});
