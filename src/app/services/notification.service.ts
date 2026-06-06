import { Injectable } from '@angular/core';

export interface NotificationItem {
  id: string;
  userId: number;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
  read?: boolean;
}

const STORAGE_KEY = 'taskflow_notifications';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private loadAll(): NotificationItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as NotificationItem[];
    } catch {
      return [];
    }
  }

  private saveAll(items: NotificationItem[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Unable to save notifications', e);
    }
  }

  addNotification(userId: number, title: string, message: string, link?: string) {
    const items = this.loadAll();
    const n: NotificationItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      title,
      message,
      link,
      createdAt: new Date().toISOString(),
      read: false
    };
    items.push(n);
    this.saveAll(items);
    return n;
  }

  getNotificationsForUser(userId: number): NotificationItem[] {
    const items = this.loadAll();
    return items.filter(i => i.userId === userId).sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
  }

  markAsRead(userId: number, notificationId: string) {
    const items = this.loadAll();
    const idx = items.findIndex(i => i.userId === userId && i.id === notificationId);
    if (idx === -1) return;
    items[idx].read = true;
    this.saveAll(items);
  }

  markAllRead(userId: number) {
    const items = this.loadAll();
    let modified = false;
    for (const it of items) {
      if (it.userId === userId && !it.read) {
        it.read = true;
        modified = true;
      }
    }
    if (modified) this.saveAll(items);
  }

  getUnreadCount(userId: number): number {
    const items = this.loadAll();
    return items.filter(i => i.userId === userId && !i.read).length;
  }
}
