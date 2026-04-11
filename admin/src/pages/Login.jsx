import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError('Email o contraseña incorrectos.')
    } else {
      navigate('/calendario')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">✂</div>
          <div className="login-title">Artisan Cut</div>
          <div className="login-subtitle">Panel de gestión</div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <a className="form-link" href="#">¿Olvidaste tu contraseña?</a>
          </div>
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-footer">Acceso exclusivo para barberos registrados</p>
      </div>
    </div>
  )
}
