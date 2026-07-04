import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useEspecialistas() {
  const [especialistas, setEspecialistas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEspecialistas()
  }, [])

  async function fetchEspecialistas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('especialistas')
      .select('*')
      .order('nombre')

    if (error) setError(error)
    else setEspecialistas(data)
    setLoading(false)
  }

  return { especialistas, loading, error, refetch: fetchEspecialistas }
}
