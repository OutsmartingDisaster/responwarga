// Store active SSE connections by userId
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

export function getConnections() {
  return connections;
}

export function sendNotificationToUser(userId: string, notification: any) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  const data = JSON.stringify({ type: 'notification', payload: notification });
  userConnections.forEach(controller => {
    try {
      controller.enqueue(`data: ${data}\n\n`);
    } catch (err) {
      // Connection closed, will be cleaned up
    }
  });
}
