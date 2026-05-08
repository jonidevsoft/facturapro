import { clsx } from 'clsx'

// ── Spinner
export function Spinner({ className = '' }) {
  return <div className={clsx('spinner', className)} />
}

// ── Empty state
export function Empty({ icon = '📭', title = 'Sin resultados', desc = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <span className="text-5xl">{icon}</span>
      <p className="font-bold text-[#e8eaf0]">{title}</p>
      {desc && <p className="text-sm text-muted">{desc}</p>}
    </div>
  )
}

// ── Modal
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className={clsx('relative z-10 card w-full shadow-2xl animate-fadeUp', width)}
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-base">{title}</h2>
          <button onClick={onClose}
                  className="text-muted hover:text-[#e8eaf0] text-xl leading-none transition-colors">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Toast simple
export function Toast({ message, type = 'success', onClose }) {
  const colors = { success: 'border-accent text-accent', error: 'border-danger text-danger' }
  return (
    <div className={clsx(
      'fixed bottom-6 right-6 z-[100] card px-4 py-3 flex items-center gap-3',
      'shadow-xl animate-fadeUp border-l-2', colors[type]
    )}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span className="text-sm text-[#e8eaf0]">{message}</span>
      <button onClick={onClose} className="text-muted hover:text-[#e8eaf0] ml-2">×</button>
    </div>
  )
}

// ── Input field
export function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="text-xs text-danger mt-0.5">{error}</p>}
    </div>
  )
}

// ── Status badge
export function StatusBadge({ status }) {
  const cls = {
    draft:     'badge-draft',
    issued:    'badge-issued',
    paid:      'badge-paid',
    overdue:   'badge-overdue',
    cancelled: 'badge-cancelled',
  }
  const label = {
    draft: 'Borrador', issued: 'Emitida', paid: 'Pagada',
    overdue: 'Vencida', cancelled: 'Anulada',
  }
  return <span className={clsx('badge', cls[status])}>{label[status] || status}</span>
}

// ── Confirm dialog
export function Confirm({ open, onClose, onConfirm, title, desc, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      <p className="text-sm text-muted mb-5">{desc}</p>
      <div className="flex gap-2 justify-end">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className={clsx('btn', danger ? 'btn-danger' : 'btn-primary')} onClick={onConfirm}>
          Confirmar
        </button>
      </div>
    </Modal>
  )
}
