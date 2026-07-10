import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { T } from '../lib/ui.jsx'

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
      background: 'var(--bg-gradient)',
      backgroundAttachment: 'fixed'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'var(--surface-gradient)',
        border: '1px solid var(--hairline)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 48px -24px rgba(0,0,0,0.6)',
        borderRadius: 16,
        padding: 40,
        width: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <h1 style={{ color: T.t1, fontSize: 28, margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700 }}>NEXO</h1>
        <p style={{ color: T.t2, margin: 0, fontSize: 14 }}>
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
            border: `1px solid ${T.bd2}`,
            background: T.s3,
            color: T.t1
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
            border: `1px solid ${T.bd2}`,
            background: T.s3,
            color: T.t1
          }}
        />

        {error && (
          <p style={{ color: T.rojo, fontSize: 13, margin: 0 }}>{error}</p>
        )}

        {mensajeExito && (
          <p style={{ color: T.verde, fontSize: 13, margin: 0, lineHeight: 1.4 }}>
            {mensajeExito}
          </p>
        )}

        <button type="submit" disabled={loading} style={{
          padding: 12,
          borderRadius: 8,
          border: 'none',
          background: 'linear-gradient(180deg, var(--gold-bright), var(--gold))',
          boxShadow: '0 1px 0 rgba(255,255,255,0.3) inset, 0 4px 20px rgba(201,161,94,0.25)',
          color: '#241A0A',
          fontWeight: 700,
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
            color: T.t2,
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
