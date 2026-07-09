import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useUdnObjetivos() {
  const { user } = useAuth()
  const [objetivos, setObjetivos] = useState([])
  const [avanceMensual, setAvanceMensual] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTodo = useCallback(async () => {
    setLoading(true)
    const { data: objs, error: errObjs } = await supabase
      .from('udn_objetivos_anuales')
      .select('*')
      .order('anio', { ascending: false })

    if (errObjs) {
      setError(errObjs)
      setLoading(false)
      return
    }
    setObjetivos(objs)

    if (objs.length) {
      const { data: avance, error: errAvance } = await supabase
        .from('udn_avance_mensual')
        .select('*')
        .in('udn_objetivo_id', objs.map(o => o.id))
        .order('periodo', { ascending: false })
      if (errAvance) setError(errAvance)
      else setAvanceMensual(avance)
    } else {
      setAvanceMensual([])
    }
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchTodo() }, [fetchTodo])

  async function crearObjetivoAnual(datos) {
    const { data, error } = await supabase
      .from('udn_objetivos_anuales')
      .insert([{ profile_id: user.id, ...datos }])
      .select()
      .single()
    if (!error) await fetchTodo()
    return { data, error }
  }

  async function editarObjetivoAnual(id, cambios) {
    const { error } = await supabase
      .from('udn_objetivos_anuales')
      .update(cambios)
      .eq('id', id)
    if (!error) await fetchTodo()
    return { error }
  }

  // upsert por (udn_objetivo_id, periodo): recargar el mismo mes lo corrige
  // en vez de duplicarlo.
  async function guardarAvanceMensual(udnObjetivoId, periodo, datos) {
    const { error } = await supabase
      .from('udn_avance_mensual')
      .upsert([{ udn_objetivo_id: udnObjetivoId, periodo, ...datos }], { onConflict: 'udn_objetivo_id,periodo' })
    if (!error) await fetchTodo()
    return { error }
  }

  return {
    objetivos, avanceMensual, loading, error,
    crearObjetivoAnual, editarObjetivoAnual, guardarAvanceMensual,
    refetch: fetchTodo,
  }
}
