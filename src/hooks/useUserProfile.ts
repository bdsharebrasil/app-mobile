import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { apiClient } from "@/lib/api-client";
import type { Tables } from "@/integrations/supabase/types";

export type UserProfileMetrics = {
  horas_totais: number;
  voos_escalados: number;
  ctm_abertos: number;
};

export type UserProfile = Tables<"user_profiles"> & {
  tipo_licenca?: string | null;
  metricas?: UserProfileMetrics;
  tripulante?: {
    id: string;
    user_id: string | null;
    canac: string | null;
    nome_completo: string;
    status: string | null;
    tipo_licenca: string | null;
  } | null;
};

type BackendProfile = Record<string, any>;
type BackendProfileResponse = {
  perfil: BackendProfile;
  tripulante: UserProfile["tripulante"];
  metricas?: UserProfileMetrics;
};
const profileQueryKey = (userId?: string) => ["user-profile", userId];

function mapBackendProfile({ perfil, tripulante, metricas }: BackendProfileResponse): UserProfile {
  return {
    ...perfil,
    id: perfil.id,
    email: perfil.email ?? "",
    full_name: perfil.nome_completo ?? "",
    display_name: perfil.nome_exibicao ?? "",
    phone: perfil.telefone ?? null,
    address: perfil.endereco ?? null,
    department: perfil.departamento ?? null,
    tipo: tripulante ? "Tripulante" : perfil.tipo_user ?? null,
    cpf: perfil.cpf ?? null,
    rg: perfil.rg ?? null,
    birth_date: perfil.data_nascimento ?? null,
    admission_date: perfil.data_admissao ?? null,
    canac: tripulante?.canac ?? perfil.canac ?? null,
    tipo_licenca: tripulante?.tipo_licenca ?? null,
    avatar_url: /^https?:\/\//i.test(perfil.url_avatar ?? "") ? perfil.url_avatar : null,
    created_at: perfil.data_criacao ?? null,
    updated_at: perfil.data_atualizacao ?? null,
    metricas,
    tripulante,
  } as UserProfile;
}

function mapProfileUpdates(input: Partial<UserProfile>): Record<string, unknown> {
  const fieldMap: Record<string, string> = {
    full_name: "nome_completo",
    display_name: "nome_exibicao",
    phone: "telefone",
    address: "endereco",
    cpf: "cpf",
    rg: "rg",
    birth_date: "data_nascimento",
    canac: "canac",
    tipo_licenca: "tipo_licenca",
    tipo: "tipo_licenca",
    avatar_url: "url_avatar",
  };
  return Object.fromEntries(
    Object.entries(input)
      .filter(([field]) => field in fieldMap)
      .map(([field, value]) => [fieldMap[field], value]),
  );
}

export const useUserProfile = (user: User | null | undefined) => {
  const queryClient = useQueryClient();
  const query = useQuery<UserProfile | null>({
    queryKey: profileQueryKey(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await apiClient.get<BackendProfileResponse>("/api/colaborador/perfil");
      return mapBackendProfile(response);
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (input: Partial<UserProfile>) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const response = await apiClient.patch<BackendProfileResponse>(
        "/api/colaborador/perfil",
        mapProfileUpdates(input),
      );
      return mapBackendProfile(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey(user?.id), data);
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: profileQueryKey(user?.id) });
  }, [queryClient, user?.id]);

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    updateProfile: updateProfile.mutateAsync,
    isUpdating: updateProfile.isPending,
    invalidate,
  };
};
