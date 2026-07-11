import { useSupabaseTable } from './useSupabaseTable'

export function useContactos() {
  const { data: contactos, loading, error, refetch } = useSupabaseTable('contactos', '-fecha')
  return { contactos, loading, error, refetch }
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
