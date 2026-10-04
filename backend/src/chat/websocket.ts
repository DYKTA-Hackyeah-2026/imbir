import type { Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';
import config from '../config/config.js';
import { addConnection, connectionCount } from './events.js';

const tickets = new Map<string, { userId: number; expiresAt: number; sessionExpiresAt: number }>();
export function issueChatTicket(userId: number, sessionExpiresAt: number) {
  for (const [ticket, value] of tickets) if (value.expiresAt <= Date.now()) tickets.delete(ticket);
  const ticket = randomBytes(32).toString('base64url');
  const expiresAt = Math.min(Date.now() + 30_000, sessionExpiresAt);
  tickets.set(ticket, { userId, expiresAt, sessionExpiresAt });
  return { ticket, expiresAt: new Date(expiresAt).toISOString() };
}
export function attachChatWebSocket(server: Server): () => void {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on('upgrade', (req, socket, head) => {
    let url: URL;
    try { url = new URL(req.url ?? '/', 'http://localhost'); }
    catch { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); return; }
    if (url.pathname !== '/api/v1/chat/ws') { socket.destroy(); return; }
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.length && !config.corsOrigins.includes(origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    const ticket = url.searchParams.get('ticket') ?? '';
    const auth = tickets.get(ticket);
    tickets.delete(ticket);
    if (!auth || auth.expiresAt <= Date.now() || connectionCount(auth.userId) >= 5) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      addConnection(auth.userId, ws);
      let alive = true;
      ws.on('pong', () => { alive = true; });
      ws.on('error', () => ws.terminate());
      // Channels are assigned by the server; clients cannot subscribe or mutate over WS.
      ws.on('message', () => ws.close(1008, 'Use the authenticated HTTP API'));
      const heartbeat = setInterval(() => {
        if (!alive) { ws.terminate(); return; }
        alive = false; ws.ping();
      }, 30_000);
      heartbeat.unref();
      // Refresh authentication periodically using a fresh HTTP-issued ticket.
      const expiry = setTimeout(() => ws.close(4001, 'Renew chat authentication'), Math.max(1, auth.sessionExpiresAt - Date.now()));
      expiry.unref();
      ws.once('close', () => { clearInterval(heartbeat); clearTimeout(expiry); });
    });
  });
  return () => { for (const socket of wss.clients) socket.terminate(); wss.close(); tickets.clear(); };
}
