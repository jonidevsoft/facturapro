import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { invoicesApi } from '../services/api'
import { fmt } from '../utils/helpers'
import { Spinner, Empty, StatusBadge } from '../components/ui'

const STATUSES = [
  { value: '', label: 'Todas' },
  { value: 'draft', label: 'Borrador' },
  { value: 'issued', label: 'Emitidas' },
  { value: 'paid', label: 'Pagadas' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'cancelled', label: 'Anuladas' },
]

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(params.get('status') || '')

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, search, status],
    queryFn: () => invoicesApi.list({
      page, per_page: 15,
      search: search || undefined,
      status: status || undefined,
    }).then(r => r.data),
    keepPreviousData: true,
  })

  return (
    <div>
      {/* TOPBAR */}
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-border
                      flex items-center justify-between px-8 py-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Facturas</h1>
          <p className="text-xs text-muted font-mono mt-0.5">{data?.total || 0} en total</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>
          ＋ Nueva Factura
        </button>
      </div>

      <div className="p-8">
        {/* FILTERS */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            className="input w-64"
            placeholder="🔍 Buscar por número..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <div className="flex gap-1.5">
            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => { setStatus(s.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                  ${status === s.value
                    ? 'bg-accent text-black border-accent'
                    : 'bg-surface border-border text-muted hover:text-[#e8eaf0] hover:border-muted'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : !data?.items?.length ? (
            <Empty icon="📄" title="Sin facturas" desc="Crea tu primera factura" />
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['N° Factura','Cliente','Emisión','Vencimiento','Total','Estado',''].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map(inv => (
                  <tr key={inv.id} className="table-row"
                      onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td className="td font-mono text-xs text-accent">{inv.invoice_number}</td>
                    <td className="td">
                      <p className="font-semibold text-sm">{inv.client_name}</p>
                    </td>
                    <td className="td font-mono text-xs text-muted">{fmt.date(inv.issue_date)}</td>
                    <td className="td font-mono text-xs text-muted">
                      {inv.due_date ? fmt.date(inv.due_date) : '—'}
                    </td>
                    <td className="td font-mono font-semibold">{fmt.currency(inv.total)}</td>
                    <td className="td"><StatusBadge status={inv.status} /></td>
                    <td className="td">
                      <button
                        className="text-[11px] bg-surface2 border border-border px-2 py-1
                                   rounded-md font-semibold hover:bg-accent hover:text-black
                                   hover:border-accent transition-all"
                        onClick={e => { e.stopPropagation(); navigate(`/invoices/${inv.id}`) }}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        {data?.pages > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            {Array.from({ length: data.pages }, (_, i) => (
              <button key={i}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                  ${page === i+1 ? 'bg-accent text-black' : 'btn btn-ghost'}`}
                onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
