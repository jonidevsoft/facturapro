import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { dashboardApi, invoicesApi } from '../services/api'
import { fmt, STATUS_CLASS } from '../utils/helpers'
import { StatusBadge, Spinner, Empty } from '../components/ui'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

function StatCard({ icon, value, label, change, changeUp, color }) {
  const accent = { green: '#00e5a0', blue: '#0077ff', orange: '#ff6b35', red: '#ff4757' }
  return (
    <div className="relative p-5 overflow-hidden transition-colors card hover:border-accent/50 animate-fadeUp">
      <div className="absolute top-0 right-0 w-24 h-24 translate-x-1/2 -translate-y-1/2 rounded-full"
           style={{ background: accent[color], opacity: 0.06 }} />
      <div className="mb-3 text-2xl">{icon}</div>
      <div className="font-mono text-2xl font-extrabold tracking-tight mb-0.5">{value}</div>
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">{label}</div>
      {change && (
        <div className={`text-xs font-mono mt-2 ${changeUp ? 'text-accent' : 'text-danger'}`}>
          {changeUp ? '▲' : '▼'} {change}
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 text-xs shadow-xl card">
      <p className="font-bold text-[#e8eaf0] mb-1">{label}</p>
      <p className="font-mono text-accent">{fmt.currency(payload[0]?.value)}</p>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const exportToExcel = async () => {
  const { data } = await invoicesApi.list({ per_page: 100 })
  const rows = data.items.map(inv => ({
    'N° Factura': inv.invoice_number,
    'Cliente': inv.client_name,
    'Fecha emisión': fmt.date(inv.issue_date),
    'Vencimiento': inv.due_date ? fmt.date(inv.due_date) : '—',
    'Total': parseFloat(inv.total),
    'Estado': { draft: 'Borrador', issued: 'Emitida', paid: 'Pagada', overdue: 'Vencida', cancelled: 'Anulada' }[inv.status] || inv.status,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas')
  XLSX.writeFile(wb, `facturas-${new Date().toISOString().slice(0,7)}.xlsx`)
}

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then(r => r.data),
  })

  const { data: revenue = [] } = useQuery({
    queryKey: ['dashboard-revenue'],
    queryFn: () => dashboardApi.revenue().then(r => r.data),
  })

  const { data: topClients = [] } = useQuery({
    queryKey: ['dashboard-top-clients'],
    queryFn: () => dashboardApi.topClients().then(r => r.data),
  })

  const { data: recentInvoices } = useQuery({
    queryKey: ['invoices-recent'],
    queryFn: () => invoicesApi.list({ per_page: 7 }).then(r => r.data),
  })

  if (statsLoading) return (
    <div className="flex items-center justify-center h-full">
      <Spinner className="w-8 h-8" />
    </div>
  )

  const AVATAR_COLORS = ['bg-accent/15 text-accent', 'bg-accent2/15 text-accent2',
    'bg-warn/15 text-warn', 'bg-danger/15 text-danger', 'bg-purple-500/15 text-purple-400']

  return (
    <div>
      {/* TOPBAR */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b bg-bg/80 backdrop-blur border-border">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            Dashboard
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </h1>
          <p className="text-xs text-muted font-mono mt-0.5">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="text-xs btn btn-ghost" onClick={exportToExcel}>📥 Exportar</button>
          <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>
            ＋ Nueva Factura
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* STAT CARDS */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          <StatCard icon="💵" value={fmt.currency(stats?.monthly_revenue)}
            label="Ingresos del mes" change="+12.4% vs mes anterior" changeUp color="green" />
          <StatCard icon="📄" value={stats?.total_invoices || 0}
            label="Facturas emitidas" change={`${stats?.paid_this_month || 0} pagadas este mes`} changeUp color="blue" />
          <StatCard icon="⏳" value={fmt.currency(stats?.pending_amount)}
            label="Pendiente de cobro" change={`${stats?.pending_count || 0} facturas`} color="orange" />
          <StatCard icon="🚨" value={fmt.currency(stats?.overdue_amount)}
            label="Facturas vencidas" change={`${stats?.overdue_count || 0} clientes`} color="red" />
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-[1fr_320px] gap-5">

          {/* INVOICES TABLE */}
          <div className="overflow-hidden card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-bold">Facturas Recientes</p>
                <p className="text-xs text-muted mt-0.5">Últimas 7 generadas</p>
              </div>
              <button className="font-mono text-xs font-semibold text-accent hover:underline"
                      onClick={() => navigate('/invoices')}>
                Ver todas →
              </button>
            </div>
            {!recentInvoices?.items?.length ? (
              <Empty icon="📄" title="Sin facturas aún" desc='Crea tu primera factura con "Nueva Factura"' />
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    {['N° Factura','Cliente','Fecha','Monto','Estado',''].map(h => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.items.map(inv => (
                    <tr key={inv.id} className="table-row"
                        onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td className="font-mono text-xs td text-accent">{inv.invoice_number}</td>
                      <td className="td">
                        <p className="text-sm font-semibold">{inv.client_name}</p>
                      </td>
                      <td className="font-mono text-xs td text-muted">{fmt.date(inv.issue_date)}</td>
                      <td className="font-mono font-semibold td">{fmt.currency(inv.total)}</td>
                      <td className="td"><StatusBadge status={inv.status} /></td>
                      <td className="td">
                        <button className="text-[11px] bg-surface2 border border-border
                                           px-2 py-1 rounded-md font-semibold hover:bg-accent
                                           hover:text-black hover:border-accent transition-all">
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* RIGHT COL */}
          <div className="flex flex-col gap-5">

            {/* CHART */}
            <div className="card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <p className="text-sm font-bold">Ingresos {new Date().getFullYear()}</p>
                  <p className="text-xs text-muted mt-0.5">Por mes</p>
                </div>
                <span className="font-mono text-xs text-accent">
                  {fmt.currency(stats?.monthly_revenue)}
                </span>
              </div>
              <div className="p-5">
                {revenue.length === 0 ? (
                  <div className="flex items-center justify-center text-xs h-28 text-muted">
                    Sin datos aún
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: '#5a6075', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {revenue.map((_, i) => (
                          <Cell key={i}
                            fill={i === revenue.length - 1 ? '#00e5a0' : '#1e2330'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* TOP CLIENTS */}
            <div className="overflow-hidden card">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-bold">Top Clientes</p>
                <p className="text-xs text-muted mt-0.5">Por monto facturado</p>
              </div>
              {topClients.length === 0 ? (
                <Empty icon="👤" title="Sin clientes aún" />
              ) : topClients.map((c, i) => (
                <div key={c.client_id}
                     className="flex items-center gap-3 px-5 py-3 transition-colors border-b cursor-pointer border-border last:border-0 hover:bg-surface2"
                     onClick={() => navigate(`/clients/${c.client_id}`)}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                                   text-sm font-bold flex-shrink-0 ${AVATAR_COLORS[i % 5]}`}>
                    {c.client_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{c.client_name}</p>
                    <p className="text-[11px] text-muted font-mono">{c.invoice_count} facturas</p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-accent">
                    {fmt.currency(c.total)}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
