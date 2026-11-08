/**
 * The hash of the one direct chat of two users (T113, 07_…:267-269): the
 * same for both orders of the IDs, and UNIQUE in chat_rooms.
 */
export function directChatHash(userA: number, userB: number): string {
  const [low, high] = userA < userB ? [userA, userB] : [userB, userA];
  return `direct_${low}_${high}`;
}
