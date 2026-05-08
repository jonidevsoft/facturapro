import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const fmt = {
  currency: (n) => {
    const num = parseFloat(n) || 0
    return '$' + num.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  },
  date: (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: es }) : '—',
  dateShort: (d) => d ? format(new Date(d), 'dd MMM yyyy', { locale: es }) : '—',
}

export const STATUS_LABEL = {
  draft:     'Borrador',
  issued:    'Emitida',
  paid:      'Pagada',
  overdue:   'Vencida',
  cancelled: 'Anulada',
}

export const STATUS_CLASS = {
  draft:     'badge-draft',
  issued:    'badge-issued',
  paid:      'badge-paid',
  overdue:   'badge-overdue',
  cancelled: 'badge-cancelled',
}

export const PAYMENT_LABEL = {
  cash:     'Efectivo',
  transfer: 'Transferencia',
  card:     'Tarjeta',
  cheque:   'Cheque',
}

export function getErrorMsg(err) {
  return err?.response?.data?.detail || err?.message || 'Error desconocido'
}
