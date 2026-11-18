import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Database } from "@/integrations/supabase/types";
export type Aerodromo = Database["public"]["Tables"]["aerodromes"]["Row"];
const aerodromesQueryKey = ["aerodromes-list"];
/** Aeródromos carregados exclusivamente pelo Worker; mantém o contrato legado do formulário. */
export const useAerodromes = () => {
  const query = useQuery({
    queryKey: aerodromesQueryKey,
    queryFn: async () => {
      const response = await apiClient.get<{ aerodromos: Array<{ id: string; name: string; coordenadas: string | null }> }>("/api/aerodromos");
      return (response.aerodromos || []).map((item) => ({
        id: item.id, designativo: item.id, name: item.name, coordenadas: item.coordenadas,
      })) as Aerodromo[];
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  return { aerodromes: query.data ?? [], isLoadingAerodromes: query.isLoading, refetchAerodromes: query.refetch, errorAerodromes: query.error };
};
