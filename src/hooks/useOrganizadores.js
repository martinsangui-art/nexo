import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useOrganizadores() {
  const { user } = useAuth()
  const [organizadores, setOrganizadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchOrganizadores()
  }, [])

  async function fetchOrganizadores() {
    setLoading(true)
    const { data, error } = await supabase
      .from('organizadores')
      .select('*')
      .order('razon_social')

    if (error) setError(error)
    else setOrganizadores(data)
    setLoading(false)
  }

  async function agregarOrganizador({ razon_social, zona }) {
    const { data, error } = await supabase
      .from('organizadores')
      .insert([{ profile_id: user.id, razon_social, zona }])
      .select()

    if (!error) fetchOrganizadores()
    return { data, error }
  }

  async function editarOrganizador(id, cambios) {
    const { error } = await supabase
      .from('organizadores')
      .update(cambios)
      .eq('id', id)

    if (!error) fetchOrganizadores()
    return { error }
  }

  return { organizadores, loading, error, agregarOrganizador, editarOrganizador, refetch: fetchOrganizadores }
}
