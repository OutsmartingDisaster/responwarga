'use client';

import { useEffect, useState, useCallback } from 'react';
import { notificationStream } from '@/lib/realtime/notificationStream';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  reference_type?: string;
  reference_id?: string;
}

export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=20');
      const result = await response.json();
      if (response.ok) setNotifications(result.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Fetch initial data
    fetchNotifications();

    // Connect to real-time stream
    notificationStream.connect(userId);
    setIsConnected(true);

    // Subscribe to new notifications
    const unsubscribe = notificationStream.subscribe((notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      
      // Play notification sound if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message, icon: '/icons/notification.svg' });
      }
    });

    return () => {
      unsubscribe();
      notificationStream.disconnect();
      setIsConnected(false);
    };
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true })
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { notifications, unreadCount, isConnected, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
