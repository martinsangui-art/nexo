import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useSupabaseTable } from './useSupabaseTable'

export function useOrganizadores() {
  const { user } = useAuth()
  const { data: organizadores, loading, error, refetch } = useSupabaseTable('organizadores', 'razon_social')

  async function agregarOrganizador({ razon_social, zona }) {
    const { data, error } = await supabase
      .from('organizadores')
      .insert([{ profile_id: user.id, razon_social, zona }])
      .select()

    if (!error) refetch()
    return { data, error }
  }

  async function editarOrganizador(id, cambios) {
    const { error } = await supabase
      .from('organizadores')
      .update(cambios)
      .eq('id', id)

    if (!error) refetch()
    return { error }
  }

  return { organizadores, loading, error, agregarOrganizador, editarOrganizador, refetch }
}
