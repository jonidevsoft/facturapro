import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getErrorMsg } from '../utils/helpers'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(getErrorMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* BG decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full
                        bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full
                        bg-accent2/5 blur-3xl" />
      </div>

      <div className="card w-full max-w-md p-8 relative z-10 animate-fadeUp shadow-2xl">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-xl">⚡</div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Factura<span className="text-accent">Pro</span>
            </h1>
            <p className="text-xs text-muted">Sistema de facturación</p>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-1">Iniciar sesión</h2>
        <p className="text-sm text-muted mb-6">Ingresa tus credenciales para continuar</p>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm
                          rounded-lg px-3 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handle} className="flex flex-col gap-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="correo@empresa.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center py-2.5 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <><span className="spinner w-4 h-4" /> Ingresando...</>
            ) : 'Ingresar'}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-5">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-accent hover:underline font-semibold">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
