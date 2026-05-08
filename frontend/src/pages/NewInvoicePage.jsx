import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { clientsApi, productsApi, invoicesApi } from '../services/api'
import { fmt, getErrorMsg } from '../utils/helpers'
import { Field, Toast, Spinner } from '../components/ui'

const PAYMENT_OPTIONS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'cash',     label: 'Efectivo' },
  { value: 'card',     label: 'Tarjeta' },
  { value: 'cheque',   label: 'Cheque' },
]

const emptyItem = () => ({
  description: '', quantity: 1, unit_price: 0,
  tax_rate: 19, discount_rate: 0, product_id: null,
  _key: Math.random(),
})

function calcItem(item) {
  const sub   = parseFloat(item.quantity) * parseFloat(item.unit_price) || 0
  const disc  = sub * (parseFloat(item.discount_rate) / 100) || 0
  const base  = sub - disc
  const tax   = base * (parseFloat(item.tax_rate) / 100) || 0
  return { subtotal: sub, discount: disc, tax, total: base + tax }
}

function ItemRow({ item, index, onChange, onRemove, products }) {
  const calc = calcItem(item)

  const handleProductSelect = (e) => {
    const pid = parseInt(e.target.value)
    const prod = products.find(p => p.id === pid)
    if (prod) {
      onChange(index, {
        ...item,
        product_id: prod.id,
        description: prod.name,
        unit_price: parseFloat(prod.unit_price),
        tax_rate: parseFloat(prod.tax_rate),
      })
    }
  }

  return (
    <tr className="border-b border-border">
      <td className="p-2">
        <select
          className="input text-xs py-1.5 mb-1"
          value={item.product_id || ''}
          onChange={handleProductSelect}
        >
          <option value="">— Seleccionar producto —</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
          ))}
        </select>
        <input
          className="input text-xs py-1.5"
          placeholder="Descripción del ítem *"
          value={item.description}
          onChange={e => onChange(index, { ...item, description: e.target.value })}
        />
      </td>
      <td className="p-2 w-20">
        <input type="number" min="0.001" step="0.001" className="input text-xs py-1.5 text-right"
          value={item.quantity}
          onChange={e => onChange(index, { ...item, quantity: e.target.value })} />
      </td>
      <td className="p-2 w-28">
        <input type="number" min="0" step="0.01" className="input text-xs py-1.5 text-right"
          value={item.unit_price}
          onChange={e => onChange(index, { ...item, unit_price: e.target.value })} />
      </td>
      <td className="p-2 w-20">
        <input type="number" min="0" max="100" className="input text-xs py-1.5 text-right"
          value={item.tax_rate}
          onChange={e => onChange(index, { ...item, tax_rate: e.target.value })} />
      </td>
      <td className="p-2 w-20">
        <input type="number" min="0" max="100" className="input text-xs py-1.5 text-right"
          value={item.discount_rate}
          onChange={e => onChange(index, { ...item, discount_rate: e.target.value })} />
      </td>
      <td className="p-2 w-28 text-right">
        <span className="font-mono text-sm font-semibold text-accent">
          {fmt.currency(calc.total)}
        </span>
      </td>
      <td className="p-2 w-10">
        <button onClick={() => onRemove(index)}
                className="text-muted hover:text-danger transition-colors text-lg leading-none">
          ×
        </button>
      </td>
    </tr>
  )
}

export default function NewInvoicePage() {
  const navigate = useNavigate()
  const [clientId, setClientId]     = useState('')
  const [payment, setPayment]       = useState('transfer')
  const [dueDate, setDueDate]       = useState('')
  const [notes, setNotes]           = useState('')
  const [terms, setTerms]           = useState('')
  const [items, setItems]           = useState([emptyItem()])
  const [toast, setToast]           = useState(null)
  const [clientSearch, setClientSearch] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select', clientSearch],
    queryFn: () => clientsApi.list({ per_page: 50, search: clientSearch || undefined }).then(r => r.data),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-select'],
    queryFn: () => productsApi.list({ per_page: 100 }).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: (r) => {
      showToast('Factura creada correctamente')
      setTimeout(() => navigate(`/invoices/${r.data.id}`), 800)
    },
    onError: e => showToast(getErrorMsg(e), 'error'),
  })

  const handleItemChange = useCallback((i, updated) => {
    setItems(prev => prev.map((item, idx) => idx === i ? updated : item))
  }, [])

  const handleRemoveItem = useCallback((i) => {
    setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)
  }, [])

  // Totales
  const totals = items.reduce((acc, item) => {
    const c = calcItem(item)
    return {
      subtotal: acc.subtotal + c.subtotal,
      discount: acc.discount + c.discount,
      tax:      acc.tax + c.tax,
      total:    acc.total + c.total,
    }
  }, { subtotal: 0, discount: 0, tax: 0, total: 0 })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!clientId) return showToast('Selecciona un cliente', 'error')
    const emptyItem = items.find(i => !i.description.trim())
    if (emptyItem) return showToast('Todos los ítems deben tener descripción', 'error')

    createMut.mutate({
      client_id: parseInt(clientId),
      payment_method: payment,
      due_date: dueDate || undefined,
      notes: notes || undefined,
      terms: terms || undefined,
      items: items.map(({ description, quantity, unit_price, tax_rate, discount_rate, product_id }) => ({
        description, product_id: product_id || undefined,
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unit_price),
        tax_rate: parseFloat(tax_rate),
        discount_rate: parseFloat(discount_rate),
      }))
    })
  }

  const products = productsData?.items || []
  const clients  = clientsData?.items || []

  return (
    <div>
      {/* TOPBAR */}
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-border
                      flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')}
                  className="text-muted hover:text-[#e8eaf0] transition-colors text-sm">← Volver</button>
          <span className="text-border">|</span>
          <h1 className="text-xl font-extrabold tracking-tight">Nueva Factura</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => navigate('/invoices')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={createMut.isPending}>
            {createMut.isPending
              ? <><span className="spinner w-4 h-4" /> Creando...</>
              : '✓ Crear factura'}
          </button>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-[1fr_280px] gap-6">

          {/* LEFT */}
          <div className="flex flex-col gap-5">

            {/* Cliente + datos básicos */}
            <div className="card p-5">
              <p className="font-bold text-sm mb-4">Información de la factura</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Cliente *">
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        placeholder="Buscar cliente..."
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                      />
                      <select
                        className="input flex-1"
                        value={clientId}
                        onChange={e => setClientId(e.target.value)}
                      >
                        <option value="">— Seleccionar —</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} · {c.document_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>
                </div>
                <Field label="Método de pago">
                  <select className="input" value={payment} onChange={e => setPayment(e.target.value)}>
                    {PAYMENT_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label="Fecha de vencimiento">
                  <input type="date" className="input" value={dueDate}
                         onChange={e => setDueDate(e.target.value)} />
                </Field>
              </div>
            </div>

            {/* Items */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="font-bold text-sm">Productos / Servicios</p>
                <button className="btn btn-ghost text-xs"
                        onClick={() => setItems(prev => [...prev, emptyItem()])}>
                  ＋ Agregar ítem
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Descripción','Cant.','Precio unit.','IVA %','Desc %','Total',''].map(h => (
                        <th key={h} className="th text-right first:text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <ItemRow
                        key={item._key}
                        item={item}
                        index={i}
                        products={products}
                        onChange={handleItemChange}
                        onRemove={handleRemoveItem}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="card p-5">
              <p className="font-bold text-sm mb-4">Información adicional</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Notas">
                  <textarea className="input resize-none" rows={3}
                    placeholder="Notas visibles en la factura..."
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </Field>
                <Field label="Términos y condiciones">
                  <textarea className="input resize-none" rows={3}
                    placeholder="Condiciones de pago..."
                    value={terms} onChange={e => setTerms(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          {/* RIGHT - Totals */}
          <div>
            <div className="card p-5 sticky top-24">
              <p className="label mb-4">Resumen</p>
              <div className="flex flex-col gap-3 mb-4">
                {[
                  ['Subtotal', fmt.currency(totals.subtotal)],
                  ['IVA',     fmt.currency(totals.tax)],
                  ['Descuento', `- ${fmt.currency(totals.discount)}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted">{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-mono font-extrabold text-xl text-accent">
                    {fmt.currency(totals.total)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted border-t border-border pt-3">
                <p className="font-semibold mb-1">
                  {items.length} ítem{items.length !== 1 ? 's' : ''}
                </p>
                <p>La factura se crea en estado <span className="text-[#e8eaf0] font-semibold">Borrador</span>.</p>
                <p className="mt-1">Emítela para que sea oficial.</p>
              </div>

              <button className="btn btn-primary w-full justify-center mt-4"
                      onClick={handleSubmit} disabled={createMut.isPending}>
                {createMut.isPending
                  ? <><span className="spinner w-4 h-4" />Creando...</>
                  : '✓ Crear factura'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
