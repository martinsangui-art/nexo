import { useSupabaseTable } from './useSupabaseTable'

export function usePolizas() {
  const { data: polizas, loading, error, refetch } = useSupabaseTable('polizas')
  return { polizas, loading, error, refetch }
}
