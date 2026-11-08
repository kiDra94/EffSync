/**
 * What the other members of a room read about a new message (T44): the
 * sender's name and the first 80 characters.
 */
export interface Sender {
  firstname: string;
  lastname: string;
  username: string;
}

export function senderName(sender: Sender | null): string {
  return sender
    ? `${sender.firstname} ${sender.lastname}`.trim() || sender.username
    : "Jemand";
}

export function chatNotificationText(name: string, message: string): string {
  const preview = message.substring(0, 80);
  return `💬 ${name}: ${preview}${message.length > 80 ? "..." : ""}`;
}

/** The realtime channel of a room's sockets. */
export function roomChannel(roomId: number): string {
  return `chat_${roomId}`;
}
