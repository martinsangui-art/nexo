import { useSupabaseTable } from './useSupabaseTable'

export function useEspecialistas() {
  const { data: especialistas, loading, error, refetch } = useSupabaseTable('especialistas', 'nombre')
  return { especialistas, loading, error, refetch }
}
