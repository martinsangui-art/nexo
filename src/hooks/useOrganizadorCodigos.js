import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOrganizadorCodigos() {
  const [organizadorCodigos, setOrganizadorCodigos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchOrganizadorCodigos()
  }, [])

  async function fetchOrganizadorCodigos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('organizador_codigos')
      .select('*')

    if (error) setError(error)
    else setOrganizadorCodigos(data)
    setLoading(false)
  }

  return { organizadorCodigos, loading, error, refetch: fetchOrganizadorCodigos }
}
