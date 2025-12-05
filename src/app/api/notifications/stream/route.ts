import { NextRequest } from 'next/server';
import { getConnections } from '@/lib/notifications/stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('userId required', { status: 400 });
  }

  const connections = getConnections();

  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the user's set
      if (!connections.has(userId)) {
        connections.set(userId, new Set());
      }
      connections.get(userId)!.add(controller);

      // Send initial connection message
      const data = JSON.stringify({ type: 'connected', timestamp: Date.now() });
      controller.enqueue(`data: ${data}\n\n`);

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        connections.get(userId)?.delete(controller);
        if (connections.get(userId)?.size === 0) {
          connections.delete(userId);
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
