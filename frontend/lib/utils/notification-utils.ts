import {
  Mail,
  UserCheck,
  UserX,
  Calendar,
  Swords,
  XCircle,
  Trophy,
  Play,
  Flag as FlagIcon,
  AlertTriangle,
  Scale,
  ShieldAlert,
  ClipboardList,
  LogOut,
  Bell,
  type LucideIcon,
} from 'lucide-react';

// ─── Shared TypeScript Interface ──────────────────────────────────────────────

export interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  action_url?: string;
  related_team_id?: number | null;
  related_match_id?: number | null;
  related_championship_id?: number | null;
  related_invitation_id?: number | null;
  related_leave_request_id?: number | null;
}

// ─── Notification Config (icon, color, label) ────────────────────────────────

export type NotificationColor = 'gold' | 'success' | 'error' | 'warning' | 'info' | 'muted';

export interface NotificationTypeConfig {
  icon: LucideIcon;
  color: NotificationColor;
  label: string;
}

/**
 * Mapa com a configuração visual de cada tipo de notificação.
 * Cobre os 10 tipos do backend + extras usados no frontend.
 */
export const NOTIFICATION_CONFIG: Record<string, NotificationTypeConfig> = {
  // Times
  TEAM_INVITATION:       { icon: Mail,           color: 'info',    label: 'Convite de Equipe' },
  TEAM_LEAVE_REQUEST:    { icon: LogOut,          color: 'warning', label: 'Pedido de Saída' },
  INVITATION_ACCEPTED:   { icon: UserCheck,       color: 'success', label: 'Convite Aceito' },
  INVITATION_DECLINED:   { icon: UserX,           color: 'error',   label: 'Convite Recusado' },

  // Partidas
  MATCH_SCHEDULED:       { icon: Calendar,        color: 'info',    label: 'Partida Agendada' },
  MATCH_RESULT:          { icon: Swords,          color: 'gold',    label: 'Resultado de Partida' },
  MATCH_CANCELLED:       { icon: XCircle,         color: 'error',   label: 'Partida Cancelada' },
  MATCH_CONTESTED:       { icon: AlertTriangle,   color: 'warning', label: 'Partida Contestada' },
  MATCH_CALLUP:          { icon: Calendar,        color: 'info',    label: 'Convocação' },

  // Campeonatos
  CHAMPIONSHIP_ENROLLED: { icon: Trophy,          color: 'gold',    label: 'Inscrição em Campeonato' },
  CHAMPIONSHIP_STARTED:  { icon: Play,            color: 'success', label: 'Campeonato Iniciado' },
  CHAMPIONSHIP_FINISHED: { icon: Trophy,          color: 'gold',    label: 'Campeonato Finalizado' },

  // Contestações e Penalidades
  CONTESTATION_SUBMITTED:    { icon: AlertTriangle,  color: 'warning', label: 'Contestação Enviada' },
  CONTESTATION_REVIEWED:     { icon: Scale,          color: 'info',    label: 'Contestação Revisada' },
  WALKOVER_DECLARED:         { icon: FlagIcon,       color: 'error',   label: 'W.O. Declarado' },
  PENALTY_ISSUED:            { icon: ShieldAlert,    color: 'error',   label: 'Penalidade Aplicada' },
  PENALTY_APPEAL_REVIEWED:   { icon: ClipboardList,  color: 'info',    label: 'Recurso de Penalidade' },

  // Sistema
  SYSTEM:                { icon: Bell,            color: 'muted',   label: 'Sistema' },
};

const DEFAULT_CONFIG: NotificationTypeConfig = {
  icon: Bell,
  color: 'muted',
  label: 'Notificação',
};

export function getNotificationConfig(type: string): NotificationTypeConfig {
  return NOTIFICATION_CONFIG[type] || DEFAULT_CONFIG;
}

// ─── Color utility ────────────────────────────────────────────────────────────

/**
 * Retorna classes Tailwind para o container do ícone baseado na cor semântica.
 */
export function getIconContainerClasses(color: NotificationColor): string {
  const map: Record<NotificationColor, string> = {
    gold:    'bg-gold/10 border-gold/20 text-gold',
    success: 'bg-success/10 border-success/20 text-success',
    error:   'bg-error/10 border-error/20 text-error',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    info:    'bg-info/10 border-info/20 text-info',
    muted:   'bg-white/5 border-border text-muted',
  };
  return map[color];
}

/**
 * Retorna a classe de cor do badge baseado na cor semântica.
 */
export function getBadgeClasses(color: NotificationColor): string {
  const map: Record<NotificationColor, string> = {
    gold:    'bg-gold/10 text-gold border-gold/20',
    success: 'bg-success/10 text-success border-success/20',
    error:   'bg-error/10 text-error border-error/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    info:    'bg-info/10 text-info border-info/20',
    muted:   'bg-white/5 text-muted border-border',
  };
  return map[color];
}

// ─── Time Ago ─────────────────────────────────────────────────────────────────

/**
 * Retorna texto relativo (ex: "3m atrás", "2h atrás", "Ontem", "3 dias atrás").
 */
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / 60000);

  if (diffInMins < 1) return 'Agora';
  if (diffInMins < 60) return `${diffInMins}m atrás`;

  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours}h atrás`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Ontem';
  if (diffInDays < 7) return `${diffInDays} dias atrás`;

  const weeks = Math.floor(diffInDays / 7);
  if (diffInDays < 30) return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;

  const months = Math.floor(diffInDays / 30);
  return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
}

// ─── Date Grouping ────────────────────────────────────────────────────────────

export interface NotificationGroup {
  label: string;
  notifications: Notification[];
}

/**
 * Agrupa notificações por data: "Hoje", "Ontem", "Esta semana", "Mais antigas".
 */
export function groupNotificationsByDate(notifications: Notification[]): NotificationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, Notification[]> = {
    'Hoje': [],
    'Ontem': [],
    'Esta semana': [],
    'Mais antigas': [],
  };

  for (const n of notifications) {
    const created = new Date(n.created_at);
    const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());

    if (createdDay.getTime() >= today.getTime()) {
      groups['Hoje'].push(n);
    } else if (createdDay.getTime() >= yesterday.getTime()) {
      groups['Ontem'].push(n);
    } else if (createdDay.getTime() >= weekAgo.getTime()) {
      groups['Esta semana'].push(n);
    } else {
      groups['Mais antigas'].push(n);
    }
  }

  // Retorna apenas grupos que têm notificações
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, notifications: items }));
}
