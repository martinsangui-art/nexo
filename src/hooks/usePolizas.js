import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePolizas() {
  const [polizas, setPolizas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPolizas()
  }, [])

  async function fetchPolizas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('polizas')
      .select('*')

    if (error) setError(error)
    else setPolizas(data)
    setLoading(false)
  }

  return { polizas, loading, error, refetch: fetchPolizas }
}
