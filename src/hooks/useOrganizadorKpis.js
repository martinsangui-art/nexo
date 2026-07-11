import { useSupabaseTable } from './useSupabaseTable'

export function useOrganizadorKpis() {
  const { data: organizadorKpis, loading, error, refetch } = useSupabaseTable('organizador_kpis_generales')
  return { organizadorKpis, loading, error, refetch }
}
