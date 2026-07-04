import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modoRegistro, setModoRegistro] = useState(false)
  const [error, setError] = useState(null)
  const [mensajeExito, setMensajeExito] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMensajeExito(null)
    setLoading(true)

    const { error } = modoRegistro
      ? await signUp(email, password)
      : await signIn(email, password)

    if (error) {
      setError(error.message)
    } else if (modoRegistro) {
      setMensajeExito('Te enviamos un mail de confirmación. Revisá tu bandeja de entrada (y spam) para activar tu cuenta.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0A0F1E'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#0F1628',
        border: '1px solid #202840',
        borderRadius: 16,
        padding: 40,
        width: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <h1 style={{ color: '#F0F4FF', fontSize: 28, margin: 0 }}>NEXO</h1>
        <p style={{ color: '#6B7FA8', margin: 0, fontSize: 14 }}>
          {modoRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: 12,
            borderRadius: 8,
            border: '1px solid #202840',
            background: '#162035',
            color: '#F0F4FF'
          }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{
            padding: 12,
            borderRadius: 8,
            border: '1px solid #202840',
            background: '#162035',
            color: '#F0F4FF'
          }}
        />

        {error && (
          <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>
        )}

        {mensajeExito && (
          <p style={{ color: '#22C55E', fontSize: 13, margin: 0, lineHeight: 1.4 }}>
            {mensajeExito}
          </p>
        )}

        <button type="submit" disabled={loading} style={{
          padding: 12,
          borderRadius: 8,
          border: 'none',
          background: '#0055B8',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          {loading ? 'Cargando...' : modoRegistro ? 'Registrarme' : 'Entrar'}
        </button>

        <button
          type="button"
          onClick={() => {
            setModoRegistro(!modoRegistro)
            setError(null)
            setMensajeExito(null)
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#6B7FA8',
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          {modoRegistro
            ? '¿Ya tenés cuenta? Iniciar sesión'
            : '¿No tenés cuenta? Registrate'}
        </button>
      </form>
    </div>
  )
}
