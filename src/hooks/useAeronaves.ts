import { useQuery } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import { apiClient } from "@/lib/api-client";
export type Aeronave = Tables<"aircraft">;
const aeronavesQueryKey = ["aeronaves-aircraft"];
/** Compatibilidade de formato com os componentes antigos; a fonte é o Worker/D1. */
export const useAeronaves = () => {
  const query = useQuery<Aeronave[]>({
    queryKey: aeronavesQueryKey,
    queryFn: async () => {
      const response = await apiClient.get<{ aeronaves: Array<Record<string, any>> }>("/api/sharebrasil/aeronaves");
      return (response.aeronaves || []).map((row) => ({
        ...row, id: row.id, registration: row.matricula_registro || row.registration || "",
        model: row.modelo || row.model || "", manufacturer: row.fabricante || row.manufacturer || "",
        status: row.status || "Ativa",
      })) as unknown as Aeronave[];
    },
    staleTime: 20 * 60 * 1000, gcTime: 30 * 60 * 1000, retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  return { aeronaves: Array.isArray(query.data) ? query.data : [], isLoadingAeronaves: query.isLoading, refetchAeronaves: query.refetch, errorAeronaves: query.error };
};
