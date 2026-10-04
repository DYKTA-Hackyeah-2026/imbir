import { WebSocket } from 'ws';

export type ChatEventType = 'message:new' | 'message:read' | 'chat_request:new' | 'chat_request:accepted' | 'chat_request:declined' | 'conversation:created';
const connections = new Map<number, Set<WebSocket>>();
export function addConnection(userId: number, socket: WebSocket): void {
  const sockets = connections.get(userId) ?? new Set<WebSocket>();
  sockets.add(socket);
  connections.set(userId, sockets);
  socket.once('close', () => {
    sockets.delete(socket);
    if (!sockets.size) connections.delete(userId);
  });
}
export function connectionCount(userId: number): number { return connections.get(userId)?.size ?? 0; }
export function emitChat(userIds: number[], type: ChatEventType, payload: unknown): void {
  const event = JSON.stringify({ type, payload });
  for (const id of new Set(userIds)) for (const socket of connections.get(id) ?? []) {
    if (socket.readyState === WebSocket.OPEN) {
      if (socket.bufferedAmount > 1024 * 1024) socket.terminate();
      else socket.send(event);
    }
  }
}
