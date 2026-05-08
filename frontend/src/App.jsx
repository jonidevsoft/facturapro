import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import { Spinner } from './components/ui'

import LoginPage        from './pages/LoginPage'
import RegisterPage     from './pages/RegisterPage'
import DashboardPage    from './pages/DashboardPage'
import ClientsPage      from './pages/ClientsPage'
import ProductsPage     from './pages/ProductsPage'
import InvoicesPage     from './pages/InvoicesPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import NewInvoicePage   from './pages/NewInvoicePage'

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function ProtectedRoute({ children }) {
  const { isAuth, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner className="w-8 h-8" />
    </div>
  )
  return isAuth ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuth, loading } = useAuth()
  if (loading) return null
  return isAuth ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Públicas */}
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

            {/* Protegidas */}
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/clients"  element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
            <Route path="/invoices/new" element={<ProtectedRoute><NewInvoicePage /></ProtectedRoute>} />
            <Route path="/invoices/:id"  element={<ProtectedRoute><InvoiceDetailPage /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
