import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// orderBy: nombre de columna para orden ascendente, o "-columna" para descendente.
export function useSupabaseTable(tabla, orderBy) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    let query = supabase.from(tabla).select('*')
    if (orderBy) {
      const desc = orderBy.startsWith('-')
      query = query.order(desc ? orderBy.slice(1) : orderBy, { ascending: !desc })
    }
    const { data, error } = await query
    if (error) setError(error)
    else setData(data)
    setLoading(false)
  }, [tabla, orderBy])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData, setData }
}
