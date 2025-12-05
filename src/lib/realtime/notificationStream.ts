// Server-Sent Events for real-time notifications
// This provides a simpler alternative to WebSockets for Next.js

type NotificationCallback = (notification: any) => void;

class NotificationStream {
  private eventSource: EventSource | null = null;
  private callbacks: Set<NotificationCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(userId: string) {
    if (typeof window === 'undefined') return;
    if (this.eventSource?.readyState === EventSource.OPEN) return;

    this.eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`);

    this.eventSource.onopen = () => {
      console.log('[NotificationStream] Connected');
      this.reconnectAttempts = 0;
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          this.callbacks.forEach(cb => cb(data.payload));
        }
      } catch (err) {
        console.error('[NotificationStream] Parse error:', err);
      }
    };

    this.eventSource.onerror = () => {
      console.log('[NotificationStream] Connection error, reconnecting...');
      this.eventSource?.close();
      this.eventSource = null;

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(userId), this.reconnectDelay * this.reconnectAttempts);
      }
    };
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
    this.callbacks.clear();
  }

  subscribe(callback: NotificationCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  isConnected() {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Singleton instance
export const notificationStream = new NotificationStream();
