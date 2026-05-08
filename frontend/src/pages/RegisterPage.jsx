import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../services/api'
import { getErrorMsg } from '../utils/helpers'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm]   = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden')
    setError(''); setLoading(true)
    try {
      await authApi.register({ full_name: form.full_name, email: form.email, password: form.password })
      navigate('/login?registered=1')
    } catch (err) {
      setError(getErrorMsg(err))
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent2/5 blur-3xl" />
      </div>

      <div className="card w-full max-w-md p-8 relative z-10 animate-fadeUp shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-xl">⚡</div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Factura<span className="text-accent">Pro</span>
            </h1>
            <p className="text-xs text-muted">Crear cuenta</p>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handle} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" placeholder="Juan García" value={form.full_name} onChange={set('full_name')} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="correo@empresa.com" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input type="password" className="input" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} required minLength={8} />
          </div>
          <div>
            <label className="label">Confirmar contraseña</label>
            <input type="password" className="input" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />
          </div>
          <button type="submit" disabled={loading}
                  className="btn btn-primary w-full justify-center py-2.5 mt-2 disabled:opacity-50">
            {loading ? <><span className="spinner w-4 h-4" /> Creando cuenta...</> : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-accent hover:underline font-semibold">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
