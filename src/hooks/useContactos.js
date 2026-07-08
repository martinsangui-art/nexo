import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useContactos() {
  const [contactos, setContactos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchContactos()
  }, [])

  async function fetchContactos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .order('fecha', { ascending: false })

    if (error) setError(error)
    else setContactos(data)
    setLoading(false)
  }

  return { contactos, loading, error, refetch: fetchContactos }
}

// contactos debe venir ordenado por fecha desc (así lo entrega useContactos)
// para que el primer match sea siempre el más reciente.
export function ultimoContactoPorEspecialista(contactos, especialistaId) {
  return contactos.find(c => c.especialista_id === especialistaId) ?? null
}

export function diasDesde(fecha) {
  if (!fecha) return null
  const hoy = new Date()
  const hoyDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const f = new Date(fecha)
  const fDia = new Date(f.getFullYear(), f.getMonth(), f.getDate())
  return Math.max(0, Math.round((hoyDia - fDia) / 86400000))
}
