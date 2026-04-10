/**
 * lib/utils/date.ts
 *
 * Utilitário centralizado de formatação de datas para o fuso horário do Brasil.
 *
 * REGRA DE TIMEZONE DO SISTEMA:
 * - O backend armazena todas as datas em UTC (Django USE_TZ=True).
 * - O frontend recebe strings ISO 8601 com offset UTC (ex: "2025-06-15T00:30:00+00:00").
 * - TODA exibição de data/hora ao usuário deve usar timeZone: 'America/Sao_Paulo' explícito,
 *   para garantir comportamento correto tanto em CSR (browser) quanto em SSR (servidor Next.js em UTC).
 *
 * Exemplos de conversão:
 *   "2025-06-15T00:30:00+00:00" (UTC) → "14/06/2025 21:30" (BRT, UTC-3)
 *   "2025-06-15T03:00:00+00:00" (UTC) → "15/06/2025 00:00" (BRT, UTC-3)
 */

const TZ = 'America/Sao_Paulo'

/**
 * Formata uma string de data como "dd/mês/aaaa" no fuso Brasil.
 * Ex: "14/jun./2025"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      timeZone: TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/**
 * Formata uma string de data como "dd/mm/aaaa" curto no fuso Brasil.
 * Ex: "14/06/2025"
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      timeZone: TZ,
    })
  } catch {
    return '—'
  }
}

/**
 * Formata uma string de data como "dd de mês longo de aaaa" no fuso Brasil.
 * Ex: "14 de junho de 2025"
 */
export function formatDateLong(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      timeZone: TZ,
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/**
 * Formata apenas a hora no fuso Brasil.
 * Ex: "21:30"
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

/**
 * Formata data e hora completos no fuso Brasil.
 * Ex: "14/jun./2025, 21:30"
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleString('pt-BR', {
      timeZone: TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

/**
 * Formata data e hora no estilo curto: "14/06/2025 21:30"
 */
export function formatDateTimeShort(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleString('pt-BR', {
      timeZone: TZ,
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

/**
 * Formata data e hora no estilo longo com Intl.DateTimeFormat.
 * Ex: "14 de junho de 2025 às 21:30"
 */
export function formatDateTimeLong(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ,
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(dateString))
  } catch {
    return '—'
  }
}

/**
 * Retorna o nome do mês e ano no fuso Brasil.
 * Ex: "junho de 2025"
 */
export function formatMonthYear(date: Date): string {
  try {
    return date.toLocaleDateString('pt-BR', {
      timeZone: TZ,
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/**
 * Formata apenas dia e mês curto no fuso Brasil.
 * Ex: "14/jun."
 */
export function formatDayMonth(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      timeZone: TZ,
      day: '2-digit',
      month: 'short',
    })
  } catch {
    return '—'
  }
}

/**
 * Retorna a data atual formatada como "dd/mm/aaaa" no fuso Brasil.
 * Usado para impressão/exportação de relatórios.
 */
export function formatToday(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: TZ,
  })
}
