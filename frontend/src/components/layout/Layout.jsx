import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { clsx } from 'clsx'

const NAV = [
  { to: '/',         icon: '◼', label: 'Dashboard' },
  { to: '/invoices', icon: '📄', label: 'Facturas',  badge: null },
  { to: '/clients',  icon: '👤', label: 'Clientes' },
  { to: '/products', icon: '📦', label: 'Productos' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = user?.full_name
    ?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-[220px] min-w-[220px] bg-surface border-r border-border flex flex-col">
        {/* Logo */}
        <div className="px-6 py-7 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-base">⚡</div>
            <span className="text-lg font-extrabold tracking-tight">
              Factura<span className="text-accent">Pro</span>
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest px-3 mb-2 mt-3">
            Principal
          </p>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => clsx(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold',
                'transition-colors relative group',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:bg-surface2 hover:text-[#e8eaf0]'
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/5
                                     bg-accent rounded-r-full" />
                  )}
                  <span className="w-5 text-center text-base">{item.icon}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}

          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest px-3 mb-2 mt-5">
            Finanzas
          </p>
          <NavLink
            to="/invoices?status=overdue"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold
                       text-muted hover:bg-surface2 hover:text-[#e8eaf0] transition-colors"
          >
            <span className="w-5 text-center">⚠</span>
            Vencidas
          </NavLink>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer
                           hover:bg-surface2 transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent2 to-accent
                            flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user?.full_name}</p>
              <p className="text-[11px] text-muted truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-muted hover:text-danger opacity-0 group-hover:opacity-100
                         transition-all text-base"
            >⏻</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
