'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationEmptyState } from '@/components/notifications/NotificationEmptyState';
import Link from 'next/link';

const MAX_DROPDOWN_ITEMS = 8;

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fechar com Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const displayNotifications = notifications.slice(0, MAX_DROPDOWN_ITEMS);
  const hasMore = notifications.length > MAX_DROPDOWN_ITEMS;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors hover:bg-surface1"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
      >
        <Bell className="h-5 w-5 text-muted hover:text-text transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold2 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[400px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface1 shadow-2xl shadow-black/30 animate-reveal">
          {/* Header */}
          <div className="border-b border-border bg-surface2/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="font-heading font-bold text-text text-sm">
                  Notificações
                </h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold/15 text-gold border border-gold/30">
                    {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1.5 text-xs text-gold font-medium transition-colors hover:text-gold/80"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Marcar todas</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[min(26rem,calc(100vh-8rem))] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {notifications.length === 0 ? (
              <NotificationEmptyState
                variant="no-notifications"
                size="compact"
              />
            ) : (
              <div className="divide-y divide-border/50">
                {displayNotifications.map((notification: any) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                    variant="compact"
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border bg-surface2/50 px-4 py-2.5 text-center">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-gold transition-colors hover:text-gold/80"
              >
                Ver todas as notificações
                {hasMore && ` (${notifications.length})`}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
