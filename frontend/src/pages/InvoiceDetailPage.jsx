import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { invoicesApi } from '../services/api'
import { fmt, PAYMENT_LABEL } from '../utils/helpers'
import { Spinner, StatusBadge, Toast, Confirm } from '../components/ui'
import { useState } from 'react'
import { getErrorMsg } from '../utils/helpers'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(id).then(r => r.data),
  })

  const issueMut = useMutation({
    mutationFn: () => invoicesApi.issue(id),
    onSuccess: () => { qc.invalidateQueries(['invoice', id]); showToast('Factura emitida') },
    onError: e => showToast(getErrorMsg(e), 'error'),
  })

  const cancelMut = useMutation({
    mutationFn: () => invoicesApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries(['invoice', id]); setConfirm(null); showToast('Factura anulada') },
    onError: e => showToast(getErrorMsg(e), 'error'),
  })

  const markPaidMut = useMutation({
    mutationFn: () => invoicesApi.update(id, { status: 'paid' }),
    onSuccess: () => { qc.invalidateQueries(['invoice', id]); showToast('Factura marcada como pagada') },
    onError: e => showToast(getErrorMsg(e), 'error'),
  })

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>
  if (!inv) return <div className="p-8 text-muted">Factura no encontrada</div>

  const canIssue   = inv.status === 'draft'
  const canPay     = inv.status === 'issued' || inv.status === 'overdue'
  const canCancel  = inv.status !== 'cancelled' && inv.status !== 'paid'

  return (
    <div>
      {/* TOPBAR */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b bg-bg/80 backdrop-blur border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')}
                  className="text-muted hover:text-[#e8eaf0] transition-colors text-sm">
            ← Volver
          </button>
          <span className="text-border">|</span>
          <h1 className="font-mono text-xl font-extrabold tracking-tight">{inv.invoice_number}</h1>
          <StatusBadge status={inv.status} />
        </div>
        <div className="flex gap-2">
          {canIssue && (
            <button className="btn btn-primary" onClick={() => issueMut.mutate()}
                    disabled={issueMut.isPending}>
              📤 Emitir factura
            </button>
          )}
          {canPay && (
            <button className="btn btn-ghost text-accent border-accent/30"
                    onClick={() => markPaidMut.mutate()} disabled={markPaidMut.isPending}>
              ✓ Marcar pagada
            </button>
          )}
          <button
          className="btn btn-ghost"
          onClick={async () => {
           const token = localStorage.getItem('token')
           const res = await fetch(`/api/v1/invoices/${id}/pdf`, {
             headers: { Authorization: `Bearer ${token}` }
           })
           const blob = await res.blob()
           const url = URL.createObjectURL(blob)
           window.open(url, '_blank')
        }}
>
  📄 Descargar PDF
</button>
          {canCancel && (
            <button className="btn btn-danger" onClick={() => setConfirm('cancel')}>
              Anular
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl p-8 mx-auto">
        <div className="grid grid-cols-[1fr_280px] gap-6">

          {/* LEFT */}
          <div className="flex flex-col gap-5">

            {/* Client info */}
            <div className="p-5 card">
              <p className="mb-3 label">Cliente</p>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 text-sm font-bold rounded-xl bg-accent/10 text-accent">
                  {inv.client.name.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold">{inv.client.name}</p>
                  <p className="font-mono text-xs text-muted">
                    {inv.client.document_type}: {inv.client.document_number}
                  </p>
                  {inv.client.email && <p className="text-xs text-muted">{inv.client.email}</p>}
                  {inv.client.address && <p className="text-xs text-muted">{inv.client.address}</p>}
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="overflow-hidden card">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-bold">Ítems de la factura</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    {['Descripción','Cant.','Precio unit.','IVA','Desc.','Total'].map(h => (
                      <th key={h} className="text-right th first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="font-medium td">{item.description}</td>
                      <td className="font-mono text-xs text-right td">{item.quantity}</td>
                      <td className="font-mono text-xs text-right td">{fmt.currency(item.unit_price)}</td>
                      <td className="font-mono text-xs text-right td text-muted">{item.tax_rate}%</td>
                      <td className="font-mono text-xs text-right td text-muted">{item.discount_rate}%</td>
                      <td className="font-mono font-semibold text-right td">{fmt.currency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {(inv.notes || inv.terms) && (
              <div className="flex flex-col gap-3 p-5 card">
                {inv.notes && (
                  <div>
                    <p className="mb-1 label">Notas</p>
                    <p className="text-sm text-muted">{inv.notes}</p>
                  </div>
                )}
                {inv.terms && (
                  <div>
                    <p className="mb-1 label">Términos y condiciones</p>
                    <p className="text-sm text-muted">{inv.terms}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT - Summary */}
          <div className="flex flex-col gap-4">
            <div className="p-5 card">
              <p className="mb-4 label">Resumen</p>
              <div className="flex flex-col gap-2">
                {[
                  ['Emisión', fmt.date(inv.issue_date)],
                  ['Vencimiento', inv.due_date ? fmt.date(inv.due_date) : '—'],
                  ['Pago', inv.paid_date ? fmt.date(inv.paid_date) : '—'],
                  ['Método', PAYMENT_LABEL[inv.payment_method] || inv.payment_method],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted">{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 card">
              <p className="mb-4 label">Totales</p>
              <div className="flex flex-col gap-2">
                {[
                  ['Subtotal', fmt.currency(inv.subtotal)],
                  ['IVA', fmt.currency(inv.tax_amount)],
                  ['Descuento', `- ${fmt.currency(inv.discount_amount)}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted">{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
                  <span className="font-bold">Total</span>
                  <span className="font-mono text-lg font-extrabold text-accent">
                    {fmt.currency(inv.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Confirm
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={() => cancelMut.mutate()}
        title="Anular factura"
        desc={`¿Estás seguro de anular ${inv.invoice_number}? Esta acción no se puede deshacer.`}
        danger
      />

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
