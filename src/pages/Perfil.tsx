import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Loader2, User, UserRound, Calendar, Clock, Eye, EyeOff, ShieldCheck, AlertCircle,
  FileText, PiggyBank, Timer, ChevronRight, LogOut, Phone, MapPin, Fingerprint, Plane, BadgeCheck, KeyRound,
} from "lucide-react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";
import { EmployeeDocumentsManager } from "@/components/profile/EmployeeDocumentsManager";
import { TimeClockTab } from "@/components/profile/TimeClockTab";

/* ───────────────────────── Tokens visuais ───────────────────────── */

// Superfície padrão: contorno fino + sombra em duas camadas (profundidade sutil, estilo iOS)
const SURFACE =
  "bg-card rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] " +
  "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_14px_32px_-18px_rgba(16,24,40,0.18)] " +
  "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_32px_-18px_rgba(0,0,0,0.6)]";

const PRESS = "transition-transform duration-150 ease-out active:scale-[0.97] touch-manipulation select-none";

const INPUT_CLASS =
  "h-[50px] rounded-[14px] bg-muted/40 border-border/60 text-[16px] px-4 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0";

const TONES = {
  blue: "from-sky-400 to-blue-600",
  indigo: "from-indigo-400 to-indigo-600",
  emerald: "from-emerald-400 to-emerald-600",
  amber: "from-amber-400 to-orange-500",
  rose: "from-rose-400 to-rose-600",
  slate: "from-slate-400 to-slate-600",
} as const;
type Tone = keyof typeof TONES;

const IconTile = ({ icon: Icon, tone = "blue" }: { icon: any; tone?: Tone }) => (
  <div
    className={`w-[30px] h-[30px] shrink-0 rounded-[9px] bg-gradient-to-b ${TONES[tone]} text-white flex items-center justify-center
    shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.3),0_1px_2px_rgba(0,0,0,0.18)]`}
  >
    <Icon size={16} strokeWidth={2.2} />
  </div>
);

/* ───────────────────────── Subcomponentes ───────────────────────── */

const Group = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <section className="mb-6">
    {title && <h3 className="px-4 mb-2 text-[13px] font-medium text-muted-foreground">{title}</h3>}
    <div className={`${SURFACE} overflow-hidden`}>{children}</div>
  </section>
);

// Divisor inset (começa depois do ícone), como nas listas agrupadas do iOS
const ROW =
  "relative flex items-center gap-3 px-4 min-h-[60px] py-2.5 " +
  "after:absolute after:bottom-0 after:left-[58px] after:right-0 after:h-px after:bg-border/70 last:after:hidden";

type FieldProps = {
  label: string;
  value: string;
  icon: any;
  tone?: Tone;
  editable: boolean;
  onChangeText: (v: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
};

const Field = ({ label, value, icon, tone, editable, onChangeText, type = "text", inputMode, autoComplete }: FieldProps) => {
  const body = (
    <>
      <IconTile icon={icon} tone={tone} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] leading-4 text-muted-foreground">{label}</p>
        {editable ? (
          <input
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => onChangeText(e.target.value)}
            className="w-full bg-transparent text-[16px] leading-6 font-medium text-foreground caret-primary outline-none placeholder:text-muted-foreground/40"
            placeholder="Preencher"
          />
        ) : (
          <p className="text-[16px] leading-6 font-medium text-foreground truncate">{value || "Não informado"}</p>
        )}
      </div>
    </>
  );
  return editable ? (
    <label className={`${ROW} cursor-text bg-primary/[0.03]`}>{body}</label>
  ) : (
    <div className={ROW}>{body}</div>
  );
};

const GlassStat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
  <div
    className="flex-1 min-w-0 rounded-[20px] px-3 py-3.5 flex flex-col items-center gap-0.5
    bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
  >
    <Icon size={18} strokeWidth={1.75} className="text-[#E3C48B] mb-1" />
    <span className="text-white text-[22px] font-semibold tracking-tight leading-none tabular-nums">{value}</span>
    <span className="text-white/55 text-[11px] leading-4 text-center mt-1">{label}</span>
  </div>
);

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { text: string; cls: string }> = {
    approved: { text: "Aprovado", cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 ring-emerald-500/25" },
    rejected: { text: "Rejeitado", cls: "bg-rose-500/12 text-rose-700 dark:text-rose-400 ring-rose-500/25" },
    pending: { text: "Em análise", cls: "bg-amber-500/12 text-amber-700 dark:text-amber-400 ring-amber-500/25" },
  };
  const s = map[status] ?? map.pending;
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset ${s.cls}`}>{s.text}</span>;
};

const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className={`${SURFACE} py-12 px-6 flex flex-col items-center text-center gap-2`}>
    <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
      <Icon size={26} className="text-muted-foreground/60" strokeWidth={1.5} />
    </div>
    <p className="text-[15px] font-medium text-muted-foreground">{text}</p>
  </div>
);

/* ───────────────────────── Helpers ───────────────────────── */

const getInitials = (input: string | null | undefined) => {
  if (!input) return "";
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return input.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
};

const buildAvatarPath = (userId: string, fileName: string) => {
  const extension = fileName.split(".").pop();
  const uniqueId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return extension ? `${userId}/${uniqueId}.${extension}` : `${userId}/${uniqueId}`;
};

// "2026-10-29" -> Date local (evita o bug do dia anterior causado por UTC)
const parseLocalDate = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const formatShortDate = (value: string) =>
  parseLocalDate(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const AVATAR_CROP_BOX_SIZE = 240;
const AVATAR_OUTPUT_SIZE = 512;
const DEFAULT_CROP_SCALE = 1;

type ContactType = "Colaboradores" | "Clientes" | "Fornecedores" | "Hoteis";
type FormState = {
  full_name: string; display_name: string; phone: string; address: string; tipo: ContactType | "";
  cpf: string; rg: string; birth_date: string; bank_name: string; bank_agency: string;
  bank_account: string; bank_pix: string; canac: string;
};
const EMPTY_FORM: FormState = {
  full_name: "", display_name: "", phone: "", address: "", tipo: "", cpf: "", rg: "",
  birth_date: "", bank_name: "", bank_agency: "", bank_account: "", bank_pix: "", canac: "",
};

type TabId = "dados" | "ponto" | "salario" | "ferias" | "docs";

/* ───────────────────────── Página ───────────────────────── */

export default function Perfil() {
  const navigate = useNavigate();
  const { user, roles, signOut } = useAuth();
  const { toast } = useToast();
  const isAdmin = roles.includes("admin");
  const isGestorMaster = roles.includes("gestor_master");
  const showTimeClock = roles.some((r) => ["financeiro", "financeiro_master", "adm", "operacoes"].includes(r));

  const { profile, updateProfile, isUpdating } = useUserProfile(user);

  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [tab, setTab] = useState<TabId>("dados");
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImage, setCropImage] = useState<{ file: File; url: string } | null>(null);
  const [cropMeta, setCropMeta] = useState<{ width: number; height: number; baseScale: number } | null>(null);
  const [cropScale, setCropScale] = useState(DEFAULT_CROP_SCALE);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropDragStart = useRef<{ x: number; y: number } | null>(null);
  const [isCropDragging, setIsCropDragging] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const syncFormFromProfile = useCallback(() => {
    if (!profile) return;
    const p: any = profile;
    setFormState({
      full_name: profile.full_name ?? "",
      display_name: profile.display_name ?? "",
      phone: profile.phone != null ? String(profile.phone) : "",
      address: profile.address ?? "",
      tipo: p?.tipo_licenca ?? "",
      cpf: p?.cpf ?? "",
      rg: p?.rg ?? "",
      birth_date: p?.birth_date ?? "",
      bank_name: p?.bank_name ?? "",
      bank_agency: p?.bank_agency ?? "",
      bank_account: p?.bank_account ?? "",
      bank_pix: p?.bank_pix ?? "",
      canac: p?.canac ?? "",
    });
  }, [profile]);

  useEffect(() => { syncFormFromProfile(); }, [syncFormFromProfile]);
  useEffect(() => () => { if (cropImage) URL.revokeObjectURL(cropImage.url); }, [cropImage]);

  const displayName = useMemo(
    () => formState.display_name || formState.full_name || profile?.full_name || user?.email || "Usuário",
    [formState.display_name, formState.full_name, profile?.full_name, user?.email],
  );
  const avatarInitials = useMemo(() => getInitials(displayName), [displayName]);
  const isProfileBusy = isUpdating || avatarUploading;
  const userId = user?.id ?? "";

  const { data: salaryPayments = [] } = useQuery({
    queryKey: ["profile-salary-payments", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from("pagamento_salario_funcionario").select("*").eq("user_profile", userId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: vacationRequests = [], refetch: refetchVacations } = useQuery({
    queryKey: ["vacation-requests", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from("vacation_requests" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const workingMonths = useMemo(() => {
    const admission = (profile as any)?.admission_date as string | undefined;
    if (!admission) return 0;
    const start = parseLocalDate(admission);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
  }, [profile]);

  const vacations = vacationRequests as any[];
  const availableVacationDays = workingMonths < 12 ? 0 : 30;
  const approvedTakenVacation = vacations.filter((r) => r.status === "approved").reduce((s, r) => s + (Number(r.days) || 0), 0);
  const pendingVacationDays = vacations.filter((r) => r.status === "pending").reduce((s, r) => s + (Number(r.days) || 0), 0);
  const remainingVacation = Math.max(0, availableVacationDays - approvedTakenVacation);

  /* ── Ações ── */

  const handleVacationRequest = async () => {
    if (workingMonths < 12) return toast({ title: "Período aquisitivo incompleto", variant: "destructive" });
    if (!startDate || !endDate) return toast({ title: "Informe as datas", variant: "destructive" });
    const s = parseLocalDate(startDate);
    const e = parseLocalDate(endDate);
    if (e < s) return toast({ title: "A data final precisa ser depois da inicial", variant: "destructive" });
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;

    const { error } = await supabase.from("vacation_requests" as any).insert({ user_id: userId, start_date: startDate, end_date: endDate, days, status: "pending" });
    if (error) toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
    else { toast({ title: "Solicitação enviada" }); setStartDate(""); setEndDate(""); refetchVacations(); }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) return toast({ title: "A senha precisa ter ao menos 6 caracteres", variant: "destructive" });
    if (newPassword !== confirmPassword) return toast({ title: "As senhas não conferem", variant: "destructive" });
    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);
    if (error) toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    else { toast({ title: "Senha alterada com sucesso" }); setNewPassword(""); setConfirmPassword(""); setPasswordOpen(false); }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleSaveEditableFields = async () => {
    try { await updateProfile(formState); setIsEditing(false); toast({ title: "Perfil atualizado" }); }
    catch { toast({ title: "Erro ao atualizar", variant: "destructive" }); }
  };

  const handleCancelEdit = () => { syncFormFromProfile(); setIsEditing(false); };

  const startEditing = () => { setTab("dados"); setIsEditing(true); };

  /* ── Recorte de foto ── */

  const resetCropState = useCallback(() => {
    setCropDialogOpen(false); setCropImage(null); setCropMeta(null);
    setCropScale(DEFAULT_CROP_SCALE); setCropPosition({ x: 0, y: 0 }); setIsCropDragging(false);
  }, []);

  const clampPosition = useCallback((position: { x: number; y: number }, scaleOverride?: number) => {
    if (!cropMeta) return position;
    const scale = scaleOverride ?? cropScale;
    const maxX = Math.max((cropMeta.width * cropMeta.baseScale * scale - AVATAR_CROP_BOX_SIZE) / 2, 0);
    const maxY = Math.max((cropMeta.height * cropMeta.baseScale * scale - AVATAR_CROP_BOX_SIZE) / 2, 0);
    return { x: Math.min(Math.max(position.x, -maxX), maxX), y: Math.min(Math.max(position.y, -maxY), maxY) };
  }, [cropMeta, cropScale]);

  const handleCropPointerDown = (e: React.PointerEvent) => {
    if (!cropMeta) return;
    setIsCropDragging(true);
    cropDragStart.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!isCropDragging || !cropDragStart.current) return;
    const dx = e.clientX - cropDragStart.current.x;
    const dy = e.clientY - cropDragStart.current.y;
    cropDragStart.current = { x: e.clientX, y: e.clientY };
    setCropPosition((prev) => clampPosition({ x: prev.x + dx, y: prev.y + dy }));
  };

  const endCropDrag = () => { setIsCropDragging(false); cropDragStart.current = null; };

  const handleConfirmCrop = async () => {
    if (!cropImage || !cropMeta || !cropImageRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_OUTPUT_SIZE; canvas.height = AVATAR_OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleMultiplier = cropMeta.baseScale * cropScale;
    const ratio = AVATAR_OUTPUT_SIZE / AVATAR_CROP_BOX_SIZE;
    const drawWidth = cropMeta.width * scaleMultiplier * ratio;
    const drawHeight = cropMeta.height * scaleMultiplier * ratio;
    ctx.drawImage(
      cropImageRef.current,
      (AVATAR_OUTPUT_SIZE - drawWidth) / 2 + cropPosition.x * ratio,
      (AVATAR_OUTPUT_SIZE - drawHeight) / 2 + cropPosition.y * ratio,
      drawWidth, drawHeight,
    );

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setAvatarUploading(true);
      try {
        const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        const path = buildAvatarPath(userId, "avatar.jpg");
        const { error: uploadError } = await supabase.storage.from("avatar-profile").upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("avatar-profile").getPublicUrl(path);
        await updateProfile({ avatar_url: publicUrl });
        toast({ title: "Foto atualizada" });
        resetCropState();
      } catch {
        toast({ title: "Erro no upload da foto", variant: "destructive" });
      } finally {
        setAvatarUploading(false);
      }
    }, "image/jpeg", 0.9);
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { setCropImage({ file, url: URL.createObjectURL(file) }); setCropDialogOpen(true); }
    event.target.value = ""; // permite escolher a mesma foto de novo
  };

  if (!user) return <div className="p-10 text-center font-medium text-muted-foreground">Usuário não autenticado</div>;

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "dados", label: "Dados", icon: User },
    ...(showTimeClock ? [{ id: "ponto" as TabId, label: "Ponto", icon: Timer }] : []),
    { id: "salario", label: "Salário", icon: PiggyBank },
    { id: "ferias", label: "Férias", icon: Calendar },
    { id: "docs", label: "Docs", icon: FileText },
  ];

  // Container central: ocupa a tela no iPhone, centraliza no iPad
  const WRAP = "mx-auto w-full max-w-[680px] px-4 sm:px-6 md:px-8";

  return (
    <MobileLayout>
      <MotionConfig reducedMotion="user">
        {/* ── Recorte de foto ── */}
        <Dialog open={cropDialogOpen} onOpenChange={(o) => (o ? setCropDialogOpen(true) : resetCropState())}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-[400px] rounded-[28px] bg-card border-black/[0.06] dark:border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <DialogHeader>
              <DialogTitle className="text-center text-[17px] font-semibold">Ajustar foto</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-6 items-center my-2">
              <div
                className="relative overflow-hidden rounded-full bg-muted/40 touch-none cursor-grab active:cursor-grabbing ring-1 ring-black/10 dark:ring-white/15"
                style={{ width: AVATAR_CROP_BOX_SIZE, height: AVATAR_CROP_BOX_SIZE }}
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={endCropDrag}
                onPointerCancel={endCropDrag}
              >
                {cropImage && (
                  <img
                    ref={cropImageRef}
                    src={cropImage.url}
                    alt="Pré-visualização do recorte"
                    draggable={false}
                    onLoad={(e) => {
                      const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                      setCropMeta({ width: w, height: h, baseScale: Math.max(AVATAR_CROP_BOX_SIZE / w, AVATAR_CROP_BOX_SIZE / h) });
                    }}
                    className="absolute pointer-events-none select-none max-w-none"
                    style={{
                      left: "50%", top: "50%",
                      width: cropMeta ? `${cropMeta.width * cropMeta.baseScale * cropScale}px` : "auto",
                      height: cropMeta ? `${cropMeta.height * cropMeta.baseScale * cropScale}px` : "auto",
                      transform: `translate(calc(-50% + ${cropPosition.x}px), calc(-50% + ${cropPosition.y}px))`,
                    }}
                  />
                )}
              </div>
              <div className="w-full px-2 py-2">
                <Slider
                  min={1} max={3} step={0.01} value={[cropScale]}
                  onValueChange={([v]) => { setCropScale(v); setCropPosition((prev) => clampPosition(prev, v)); }}
                  aria-label="Zoom da foto"
                />
              </div>
            </div>
            <DialogFooter className="flex-row gap-3 sm:justify-center">
              <Button variant="outline" onClick={resetCropState} className={`flex-1 h-[50px] rounded-[14px] text-[16px] font-semibold ${PRESS}`}>Cancelar</Button>
              <Button onClick={handleConfirmCrop} disabled={avatarUploading || !cropMeta} className={`flex-1 h-[50px] rounded-[14px] text-[16px] font-semibold ${PRESS}`}>
                {avatarUploading ? <Loader2 className="animate-spin" size={18} /> : "Salvar foto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleAvatarUpload} />

        <div className="flex flex-col min-h-[100dvh] bg-background pb-[calc(7rem+env(safe-area-inset-bottom))]">
          {/* ── Hero ── */}
          <header
            className="relative rounded-b-[32px] overflow-hidden pb-6 pt-[max(env(safe-area-inset-top),1rem)]"
            style={{
              backgroundImage:
                "radial-gradient(120% 80% at 85% -10%, rgba(64,116,255,0.30), transparent 55%)," +
                "radial-gradient(90% 60% at 0% 0%, rgba(214,178,112,0.14), transparent 60%)," +
                "linear-gradient(180deg,#0C1932 0%,#070D1A 100%)",
            }}
          >
            <div className={WRAP}>
              <div className="flex items-center justify-between h-11 mt-2">
                <h1 className="text-white text-[32px] leading-none font-bold tracking-tight">Perfil</h1>
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className={`h-10 px-4 rounded-full text-white/80 text-[15px] font-medium ${PRESS}`}
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (isEditing ? handleSaveEditableFields() : startEditing())}
                    disabled={isProfileBusy}
                    className={`h-10 min-w-[84px] px-4 rounded-full text-white text-[15px] font-semibold flex items-center justify-center
                    bg-white/10 backdrop-blur-xl border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ${PRESS}`}
                  >
                    {isEditing ? (isProfileBusy ? <Loader2 className="animate-spin" size={16} /> : "Concluir") : "Editar"}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-5 mt-7">
                <div className="relative shrink-0 border-[1px] border-[rgba(51,97,110,0.01)]">
                  <div className="w-[84px] h-[84px] sm:w-24 sm:h-24 rounded-[33px] bg-[#0B1427] border-[2px] border-[rgba(245,166,35,0.91)] flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} className="w-full h-full object-cover border-[1px] border-[rgba(245,166,35,0.55)]" alt={displayName} />
                    ) : (
                      <span className="text-white/70 text-[26px] font-semibold">{avatarInitials}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Alterar foto"
                    onClick={() => fileInputRef.current?.click()}
                    className={`absolute -bottom-0.5 -right-0.5 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center
                    border-[3px] border-[#0B1427] shadow-lg before:absolute before:-inset-1.5 before:content-[''] ${PRESS}`}
                  >
                    <Camera size={15} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-white text-[21px] sm:text-2xl font-semibold tracking-tight truncate">{profile?.full_name || "Piloto"}</h2>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="rounded-full px-2.5 py-0.5 text-[12px] font-medium text-[rgba(81,209,201,0.85)] bg-white/[0.08] border border-[rgba(97,245,190,1)]">
                      {profile?.tipo || "Tripulante"}
                    </span>
                    {profile?.canac && (
                      <span className="rounded-full px-2.5 py-0.5 text-[12px] font-medium text-[rgba(127,202,95,1)] bg-[#C9A25E]/10 border border-[rgba(140,201,94,1)]">
                        ANAC {profile.canac}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 sm:gap-3 mt-6">
                <GlassStat icon={Clock} label="Horas totais" value={`${Number(profile?.metricas?.horas_totais || 0).toFixed(1)}h`} />
                <GlassStat icon={Plane} label="Voos escalados" value={profile?.metricas?.voos_escalados ?? 0} />
                <GlassStat icon={AlertCircle} label="CTM abertos" value={profile?.metricas?.ctm_abertos ?? 0} />
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C9A25E]/50 to-transparent" />
          </header>

          {/* ── Conteúdo ── */}
          <main className={`${WRAP} mt-5`}>
            {/* Controle segmentado */}
            <div
              role="tablist"
              aria-label="Seções do perfil"
              className="relative flex p-1 mb-6 rounded-[16px] bg-muted/60 border border-black/[0.04] dark:border-white/[0.06]"
            >
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className={`relative flex-1 min-h-[52px] rounded-[12px] flex flex-col items-center justify-center gap-0.5 touch-manipulation select-none
                    transition-colors duration-200 active:opacity-70 ${active ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="perfil-tab-pill"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                        className="absolute inset-0 rounded-[12px] bg-card border border-black/[0.06] dark:border-white/10 shadow-[0_2px_8px_-2px_rgba(16,24,40,0.15)]"
                      />
                    )}
                    <t.icon size={19} strokeWidth={active ? 2.2 : 1.8} className="relative" />
                    <span className="relative text-[11px] font-medium leading-none">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                role="tabpanel"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {/* DADOS */}
                {tab === "dados" && (
                  <>
                    <Group title="Informações pessoais">
                      <Field label="Nome completo" icon={User} tone="blue" editable={isEditing} value={formState.full_name} autoComplete="name"
                        onChangeText={(v) => setFormState((p) => ({ ...p, full_name: v }))} />
                      <Field label="Nome de exibição" icon={UserRound} tone="indigo" editable={isEditing} value={formState.display_name}
                        onChangeText={(v) => setFormState((p) => ({ ...p, display_name: v }))} />
                      <Field label="Licença (ANAC)" icon={Plane} tone="amber" editable={isEditing} value={formState.canac}
                        onChangeText={(v) => setFormState((p) => ({ ...p, canac: v }))} />
                      <Field label="Tipo de licença" icon={BadgeCheck} tone="emerald" editable={isEditing} value={formState.tipo || ""}
                        onChangeText={(v) => setFormState((p) => ({ ...p, tipo: v as ContactType | "" }))} />
                    </Group>

                    <Group title="Contato e endereço">
                      <Field label="Telefone" icon={Phone} tone="emerald" editable={isEditing} value={formState.phone} type="tel" inputMode="tel" autoComplete="tel"
                        onChangeText={(v) => setFormState((p) => ({ ...p, phone: v }))} />
                      <Field label="CPF" icon={Fingerprint} tone="slate" editable={isEditing} value={formState.cpf} inputMode="numeric"
                        onChangeText={(v) => setFormState((p) => ({ ...p, cpf: v }))} />
                      <Field label="Endereço" icon={MapPin} tone="rose" editable={isEditing} value={formState.address} autoComplete="street-address"
                        onChangeText={(v) => setFormState((p) => ({ ...p, address: v }))} />
                    </Group>

                    <Group title="Segurança">
                      <button
                        type="button"
                        onClick={() => setPasswordOpen((o) => !o)}
                        aria-expanded={passwordOpen}
                        className={`${ROW} w-full text-left transition-colors active:bg-muted/60`}
                      >
                        <IconTile icon={KeyRound} tone="slate" />
                        <span className="flex-1 text-[16px] font-medium text-foreground">Alterar senha</span>
                        <ChevronRight size={18} className={`text-muted-foreground/60 transition-transform duration-200 ${passwordOpen ? "rotate-90" : ""}`} />
                      </button>

                      <AnimatePresence initial={false}>
                        {passwordOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 pt-1 space-y-3">
                              {[
                                { ph: "Nova senha", val: newPassword, set: setNewPassword, show: showNewPassword, toggle: setShowNewPassword },
                                { ph: "Confirmar senha", val: confirmPassword, set: setConfirmPassword, show: showConfirmPassword, toggle: setShowConfirmPassword },
                              ].map((f) => (
                                <div key={f.ph} className="relative">
                                  <Input
                                    placeholder={f.ph}
                                    type={f.show ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={f.val}
                                    onChange={(e) => f.set(e.target.value)}
                                    className={`${INPUT_CLASS} pr-12`}
                                  />
                                  <button
                                    type="button"
                                    aria-label={f.show ? "Ocultar senha" : "Mostrar senha"}
                                    onClick={() => f.toggle(!f.show)}
                                    className="absolute right-0 top-0 h-[50px] w-12 flex items-center justify-center text-muted-foreground active:opacity-60"
                                  >
                                    {f.show ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                onClick={handlePasswordChange}
                                disabled={isChangingPassword || !newPassword || !confirmPassword}
                                className={`w-full h-[50px] rounded-[14px] text-[16px] font-semibold ${PRESS}`}
                              >
                                {isChangingPassword && <Loader2 className="animate-spin mr-2" size={18} />}
                                Salvar nova senha
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Group>
                  </>
                )}

                {/* PONTO */}
                {tab === "ponto" && showTimeClock && (
                  <div className={`${SURFACE} p-4 overflow-hidden`}>
                    <TimeClockTab />
                  </div>
                )}

                {/* SALÁRIO */}
                {tab === "salario" && (
                  <section>
                    <h3 className="px-4 mb-2 text-[13px] font-medium text-muted-foreground">Histórico de pagamentos</h3>
                    {salaryPayments.length === 0 ? (
                      <EmptyState icon={PiggyBank} text="Nenhum pagamento registrado" />
                    ) : (
                      <div className="space-y-3">
                        {salaryPayments.map((s: any) => (
                          <div key={s.id} className={`${SURFACE} p-4`}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[16px] font-semibold capitalize text-foreground">
                                {new Date(s.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                              </span>
                              {s.comprovante_url && (
                                <a
                                  href={s.comprovante_url} target="_blank" rel="noreferrer"
                                  className={`min-h-[36px] inline-flex items-center rounded-full px-3.5 text-[13px] font-semibold text-primary bg-primary/10 ${PRESS}`}
                                >
                                  Ver recibo
                                </a>
                              )}
                            </div>
                            {(s.base_salary_holerite || s.horas_voo) && (
                              <div className="flex gap-8 mt-3 pt-3 border-t border-border/60">
                                {s.base_salary_holerite && (
                                  <div>
                                    <p className="text-[12px] text-muted-foreground">Salário base</p>
                                    <p className="text-[16px] font-semibold tabular-nums">{brl(Number(s.base_salary_holerite))}</p>
                                  </div>
                                )}
                                {s.horas_voo && (
                                  <div>
                                    <p className="text-[12px] text-muted-foreground">Horas voadas</p>
                                    <p className="text-[16px] font-semibold tabular-nums">{s.horas_voo}h</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* FÉRIAS */}
                {tab === "ferias" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Disponíveis", value: remainingVacation },
                        { label: "Em análise", value: pendingVacationDays },
                      ].map((c) => (
                        <div key={c.label} className={`${SURFACE} p-4`}>
                          <p className="text-[13px] text-muted-foreground">{c.label}</p>
                          <p className="mt-1 text-[32px] leading-none font-semibold tracking-tight tabular-nums">
                            {c.value}
                            <span className="ml-1 text-[14px] font-medium text-muted-foreground">dias</span>
                          </p>
                        </div>
                      ))}
                    </div>

                    <section>
                      <h3 className="px-4 mb-2 text-[13px] font-medium text-muted-foreground">Nova solicitação</h3>
                      <div className={`${SURFACE} p-4 space-y-4`}>
                        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                          <div className="space-y-1.5 min-w-0">
                            <Label className="text-[13px] text-muted-foreground">Início</Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${INPUT_CLASS} min-w-0`} />
                          </div>
                          <div className="space-y-1.5 min-w-0">
                            <Label className="text-[13px] text-muted-foreground">Término</Label>
                            <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={`${INPUT_CLASS} min-w-0`} />
                          </div>
                        </div>
                        <Button onClick={handleVacationRequest} className={`w-full h-[50px] rounded-[14px] text-[16px] font-semibold ${PRESS}`}>
                          Enviar solicitação
                        </Button>
                      </div>
                    </section>

                    {vacations.length > 0 && (
                      <section>
                        <h3 className="px-4 mb-2 text-[13px] font-medium text-muted-foreground">Histórico</h3>
                        <div className={`${SURFACE} overflow-hidden`}>
                          {vacations.map((r: any) => (
                            <div key={r.id} className={`${ROW} justify-between after:left-4`}>
                              <div className="flex items-center gap-3 min-w-0">
                                <IconTile icon={Calendar} tone="blue" />
                                <div className="min-w-0">
                                  <p className="text-[15px] font-semibold text-foreground">
                                    {formatShortDate(r.start_date)} a {formatShortDate(r.end_date)}
                                  </p>
                                  <p className="text-[13px] text-muted-foreground">{r.days} dias</p>
                                </div>
                              </div>
                              <StatusPill status={r.status} />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {/* DOCUMENTOS */}
                {tab === "docs" && (
                  <div className={`${SURFACE} p-1.5 overflow-hidden`}>
                    <EmployeeDocumentsManager
                      userId={userId}
                      isAdmin={isAdmin}
                      isFinanceiroMaster={roles.includes("financeiro_master")}
                      isGestorMaster={isGestorMaster}
                      currentUserId={user?.id}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Sair */}
            <div className="mt-8">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={`${SURFACE} w-full h-[52px] flex items-center justify-center gap-2 text-[16px] font-semibold text-destructive disabled:opacity-60 ${PRESS}`}
              >
                {isSigningOut ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
                {isSigningOut ? "Saindo…" : "Sair da conta"}
              </button>
            </div>

            <footer className="flex flex-col items-center gap-1 pt-8 pb-4 text-center">
              <span className="text-[13px] font-semibold text-muted-foreground">Share Brasil</span>
              <span className="text-[12px] text-muted-foreground/60">Versão 1.2.4 · Tripulantes</span>
            </footer>
          </main>
        </div>
      </MotionConfig>
    </MobileLayout>
  );
}
