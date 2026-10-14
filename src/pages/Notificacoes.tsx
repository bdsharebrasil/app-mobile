import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Clock3, Inbox, Loader2, RefreshCw } from "lucide-react";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { apiClient } from "@/lib/api-client";

type Notification = {
  id: string;
  id_from: string | null;
  departamento_destinatario: string | null;
  status: string | null;
  mensagem: string | null;
  criado_em: string;
  lido: number | boolean;
  origem_notificacao: "geral";
};

const queryKey = ["notificacoes-d1-pessoais"];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : date.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

export default function Notificacoes() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => apiClient.get<{ notificacoes: Notification[] }>("/api/sharebrasil/notificacoes?origem=geral"),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/sharebrasil/notificacoes/${encodeURIComponent(id)}/lida?origem=geral`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const notifications = data?.notificacoes ?? [];
  const unreadCount = notifications.filter((item) => !item.lido && !["lida", "lido", "read"].includes(String(item.status || "").toLowerCase())).length;

  return (
    <MobileLayout>
      <main className="min-h-[calc(100dvh-5.5rem)] bg-[#071326] px-4 pb-28 pt-5 text-white sm:px-6">
        <div className="mx-auto max-w-2xl">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Central pessoal</p>
              <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
              <p className="mt-1 text-sm text-slate-400">Avisos destinados a você no sistema.</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
              <Bell className="h-5 w-5" />
            </div>
          </header>

          <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-3">
              <Inbox className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-300">{notifications.length} avisos</span>
            </div>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{unreadCount} não lidos</span>
          </div>

          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-300" /> Carregando seus avisos…
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[0.07] p-5 text-center">
              <p className="text-sm text-rose-100">Não foi possível carregar suas notificações.</p>
              <button onClick={() => void refetch()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white">
                <RefreshCw className="h-4 w-4" /> Tentar novamente
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-400"><Inbox className="h-6 w-6" /></div>
              <h2 className="font-semibold text-white">Tudo em dia</h2>
              <p className="mt-1 text-sm text-slate-400">Não há notificações destinadas a você.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => {
                const read = Boolean(item.lido) || ["lida", "lido", "read"].includes(String(item.status || "").toLowerCase());
                return (
                  <article key={item.id} className={`rounded-2xl border p-4 transition-colors ${read ? "border-white/10 bg-white/[0.035]" : "border-emerald-300/20 bg-emerald-300/[0.055]"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${read ? "bg-white/[0.07] text-slate-400" : "bg-emerald-300/10 text-emerald-300"}`}>
                        {read ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">{item.mensagem || "Você recebeu uma nova notificação."}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{formatDate(item.criado_em)}</span>
                          {!read && (
                            <button
                              type="button"
                              disabled={markRead.isPending}
                              onClick={() => markRead.mutate(item.id)}
                              className="rounded-xl border border-emerald-300/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-300/10 disabled:opacity-50"
                            >
                              {markRead.isPending && markRead.variables === item.id ? "Salvando…" : "Marcar como lida"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {isFetching && !isLoading && <p className="mt-4 text-center text-xs text-slate-500">Atualizando…</p>}
        </div>
      </main>
    </MobileLayout>
  );
}
