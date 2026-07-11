import { useSupabaseTable } from './useSupabaseTable'

export function useOrganizadorCodigos() {
  const { data: organizadorCodigos, loading, error, refetch } = useSupabaseTable('organizador_codigos')
  return { organizadorCodigos, loading, error, refetch }
}
