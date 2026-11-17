import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ChatRoomItem from './ChatRoomItem.vue';

vi.mock('@/stores/useSocket', () => ({ useSocket: () => ({ socket_emit: vi.fn() }) }));

// GOALS.md M21: the room's kind comes from is_private, task_id and class_id
describe('ChatRoomItem kind', () => {
  const typeOf = (room) =>
    mount(ChatRoomItem, { props: { room: { room_id: 1, name: 'R', chat_room_users: [{}, {}], ...room } } })
      .find('.room-item__type')
      .text();

  it.each([
    [{ is_private: true }, 'Direkt'],
    [{ is_private: false }, 'Gruppe'],
    [{ is_private: false, task_id: 7 }, 'Aufgabe'],
    [{ is_private: false, class_id: 1 }, 'Klasse'],
  ])('%o is shown as %s', (room, type) => {
    expect(typeOf(room)).toBe(type);
  });
});
