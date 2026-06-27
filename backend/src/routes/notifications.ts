import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Lưu trữ danh sách kết nối SSE của các client theo userId
const clients = new Map<string, Response[]>();

export function sendNotification(userId: string, event: string, data: any) {
  const userClients = clients.get(userId);
  if (userClients) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    userClients.forEach(res => res.write(payload));
  }
}

router.get('/stream', verifyToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Gửi sự kiện kết nối thành công ban đầu
  res.write(`event: connected\ndata: {"status": "ok"}\n\n`);

  if (!clients.has(userId)) {
    clients.set(userId, []);
  }
  clients.get(userId)!.push(res);

  // Xóa kết nối khi client ngắt kết nối
  req.on('close', () => {
    const userClients = clients.get(userId);
    if (userClients) {
      const updated = userClients.filter(c => c !== res);
      if (updated.length === 0) {
        clients.delete(userId);
      } else {
        clients.set(userId, updated);
      }
    }
  });
});

export default router;
