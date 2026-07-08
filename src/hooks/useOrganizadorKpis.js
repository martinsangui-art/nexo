import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOrganizadorKpis() {
  const [organizadorKpis, setOrganizadorKpis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchOrganizadorKpis()
  }, [])

  async function fetchOrganizadorKpis() {
    setLoading(true)
    const { data, error } = await supabase
      .from('organizador_kpis_generales')
      .select('*')

    if (error) setError(error)
    else setOrganizadorKpis(data)
    setLoading(false)
  }

  return { organizadorKpis, loading, error, refetch: fetchOrganizadorKpis }
}
