import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, Save, Edit, User as UserIcon, Calendar, AlertCircle, CheckCircle, Clock, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Star, Briefcase, Building2, User, CreditCard, LayoutDashboard, FileText, PiggyBank, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { UserProfile } from "@/hooks/useUserProfile";
import { ROLE_LABELS, selectPrimaryRole, type AppRole } from "@/lib/roles";
import { getShortUserId, getIdBadgeColor } from "@/lib/user-id";
import { useQuery } from "@tanstack/react-query";
import { EmployeeDocumentsManager } from "@/components/profile/EmployeeDocumentsManager";
import { TimeClockTab } from "@/components/profile/TimeClockTab";
import useHandleStreamResponse from "@/utils/useHandleStreamResponse";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import GlassContainer from "@/components/GlassContainer";

// --- Subcomponentes de Estilo (Referência do Usuário adaptada para Web/Tailwind) ---

const ProfileField = ({ label, value, icon: Icon, editable, onChangeText, placeholder }: { 
  label: string, 
  value: string, 
  icon: any, 
  editable: boolean, 
  onChangeText: (v: string) => void,
  placeholder?: string
}) => (
  <div className="flex flex-row items-center p-4 gap-4 border-b border-border/50 last:border-0 hover:bg-muted/5 transition-colors">
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
      <Icon size={18} />
    </div>
    <div className="flex-1">
      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wider">{label}</p>
      {editable ? (
        <input
          className="w-full bg-transparent text-foreground text-[15px] font-medium focus:outline-none placeholder:text-muted-foreground/40 border-b border-primary/30 pb-0.5"
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <p className="text-foreground text-[15px] font-medium leading-tight">{value || "---"}</p>
      )}
    </div>
  </div>
);

const StatItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) => (
  <div className="flex-1 flex flex-col items-center gap-1.5 transition-transform hover:scale-105">
    <div className="text-primary p-2 bg-primary/5 rounded-full">
      <Icon size={20} />
    </div>
    <span className="text-foreground text-xl font-bold tracking-tight">{value}</span>
    <span className="text-muted-foreground text-[9px] font-bold uppercase tracking-[0.15em] text-center leading-tight opacity-70 px-1">
      {label}
    </span>
  </div>
);

// --- Helpers de Formatação ---

const getInitials = (input: string | null | undefined) => {
  if (!input) return "";
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return input.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
};

const sanitizePhone = (value: string) => value.replace(/\D/g, "");

const buildAvatarPath = (userId: string, fileName: string) => {
  const extension = fileName.split(".").pop();
  const uniqueId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return extension ? `${userId}/${uniqueId}.${extension}` : `${userId}/${uniqueId}`;
};

const formatTimestamp = (isoDate: string | null | undefined) => {
  if (!isoDate) return null;
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(isoDate));
  } catch (error) {
    return null;
  }
};

const AVATAR_CROP_BOX_SIZE = 256;
const AVATAR_OUTPUT_SIZE = 512;
const DEFAULT_CROP_SCALE = 1;

type ContactType = "Colaboradores" | "Clientes" | "Fornecedores" | "Hoteis";
type FormState = {
  full_name: string;
  display_name: string;
  phone: string;
  address: string;
  tipo: ContactType | "";
  cpf: string;
  rg: string;
  birth_date: string;
  bank_name: string;
  bank_agency: string;
  bank_account: string;
  bank_pix: string;
  canac: string;
};

// --- Componente Principal ---

export default function Perfil() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const isAdmin = roles.includes("admin");
  const isGestorMaster = roles.includes("gestor_master");
  const showTimeClock = roles.some(r => ['financeiro', 'financeiro_master', 'adm', 'operacoes'].includes(r));

  const {
    profile,
    isLoading,
    isFetching,
    updateProfile,
    isUpdating
  } = useUserProfile(user, {
    skipCreation: Boolean(isAdmin || isGestorMaster)
  });

  // Queries para os Stats (Referência do Usuário)
  const { data: flightLogs = [] } = useQuery({
    queryKey: ["flight-logs", profile?.full_name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logbook_entries")
        .select("*")
        .or(`pilot_name.ilike.%${profile?.full_name}%,copilot_name.ilike.%${profile?.full_name}%`);
      if (error) return [];
      return data;
    },
    enabled: !!profile?.full_name
  });

  const { data: maintenanceReports = [] } = useQuery({
    queryKey: ["maintenance-reports-open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_reports")
        .select("*")
        .eq("status", "open");
      if (error) return [];
      return data;
    }
  });

  const totalFlightHours = useMemo(() => {
    return flightLogs.reduce((acc: number, log: any) => acc + (Number(log.flight_time_hours) || 0) + (Number(log.flight_time_minutes) || 0) / 60, 0);
  }, [flightLogs]);

  const openCTMCount = maintenanceReports.length;

  const [formState, setFormState] = useState<FormState>({
    full_name: "",
    display_name: "",
    phone: "",
    address: "",
    tipo: "",
    cpf: "",
    rg: "",
    birth_date: "",
    bank_name: "",
    bank_agency: "",
    bank_account: "",
    bank_pix: "",
    canac: ""
  });

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImage, setCropImage] = useState<{ file: File; url: string } | null>(null);
  const [cropMeta, setCropMeta] = useState<{ width: number; height: number; baseScale: number } | null>(null);
  const [cropScale, setCropScale] = useState(DEFAULT_CROP_SCALE);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropDragStart = useRef<{ x: number; y: number } | null>(null);
  const [isCropDragging, setIsCropDragging] = useState(false);

  useEffect(() => {
    if (profile) {
      const p: any = profile as any;
      setFormState({
        full_name: profile.full_name ?? "",
        display_name: profile.display_name ?? "",
        phone: profile.phone != null ? String(profile.phone) : "",
        address: profile.address ?? "",
        tipo: (profile.tipo as any) ?? "",
        cpf: p?.cpf ?? "",
        rg: p?.rg ?? "",
        birth_date: p?.birth_date ?? "",
        bank_name: p?.bank_name ?? "",
        bank_agency: p?.bank_agency ?? "",
        bank_account: p?.bank_account ?? "",
        bank_pix: p?.bank_pix ?? "",
        canac: p?.canac ?? ""
      });
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (cropImage) URL.revokeObjectURL(cropImage.url);
    };
  }, [cropImage]);

  const displayName = useMemo(() => formState.display_name || formState.full_name || profile?.full_name || user?.email || "Usuário", [formState.display_name, formState.full_name, profile?.full_name, user?.email]);
  const avatarInitials = useMemo(() => getInitials(displayName), [displayName]);
  const isProfileBusy = isUpdating || avatarUploading;
  const userId = user?.id ?? "";

  // Salary and Vacation Queries
  const { data: salaryPayments = [] } = useQuery({
    queryKey: ["profile-salary-payments", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("pagamento_salario_funcionario").select("*").eq("user_profile", userId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId
  });

  const { data: vacationRequests = [], refetch: refetchVacations } = useQuery({
    queryKey: ["vacation-requests", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("vacation_requests" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId
  });

  // Vacation Logic
  const workingMonths = useMemo(() => {
    const admission = (profile as any)?.admission_date as string | undefined;
    if (!admission) return 0;
    const start = new Date(admission);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
  }, [profile]);

  const availableVacationDays = workingMonths < 12 ? 0 : 30; // Simplificado
  const approvedTakenVacation = (vacationRequests as any[]).filter(r => r.status === "approved").reduce((sum, r) => sum + (Number(r.days) || 0), 0);
  const remainingVacation = Math.max(0, availableVacationDays - approvedTakenVacation);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleVacationRequest = async () => {
    if (workingMonths < 12) {
      toast({ title: "Período aquisitivo incompleto", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Informe as datas", variant: "destructive" });
      return;
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    const days = Math.floor((e.getTime() - s.getTime()) / (86400000)) + 1;
    
    const { error } = await supabase.from("vacation_requests" as any).insert({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      days,
      status: "pending"
    });

    if (error) {
      toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitação enviada" });
      setStartDate("");
      setEndDate("");
      refetchVacations();
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso" });
      setNewPassword("");
      confirmPassword && setConfirmPassword("");
    }
  };

  const handleSaveEditableFields = async () => {
    try {
      await updateProfile(formState);
      setIsEditing(false);
      toast({ title: "Perfil atualizado com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  // Avatar Management
  const resetCropState = useCallback(() => {
    setCropDialogOpen(false);
    setCropImage(null);
    setCropMeta(null);
    setCropScale(DEFAULT_CROP_SCALE);
    setCropPosition({ x: 0, y: 0 });
    setIsCropDragging(false);
  }, []);

  const clampPosition = useCallback((position: { x: number; y: number }, scaleOverride?: number) => {
    if (!cropMeta) return position;
    const scale = scaleOverride ?? cropScale;
    const scaledWidth = cropMeta.width * cropMeta.baseScale * scale;
    const scaledHeight = cropMeta.height * cropMeta.baseScale * scale;
    const maxOffsetX = Math.max((scaledWidth - AVATAR_CROP_BOX_SIZE) / 2, 0);
    const maxOffsetY = Math.max((scaledHeight - AVATAR_CROP_BOX_SIZE) / 2, 0);
    return {
      x: Math.min(Math.max(position.x, -maxOffsetX), maxOffsetX),
      y: Math.min(Math.max(position.y, -maxOffsetY), maxOffsetY)
    };
  }, [cropMeta, cropScale]);

  const handleCropPointerDown = (e: React.PointerEvent) => {
    if (!cropMeta) return;
    setIsCropDragging(true);
    cropDragStart.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as any).setPointerCapture(e.pointerId);
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!isCropDragging || !cropDragStart.current) return;
    const deltaX = e.clientX - cropDragStart.current.x;
    const deltaY = e.clientY - cropDragStart.current.y;
    cropDragStart.current = { x: e.clientX, y: e.clientY };
    setCropPosition(prev => clampPosition({ x: prev.x + deltaX, y: prev.y + deltaY }));
  };

  const handleConfirmCrop = async () => {
    if (!cropImage || !cropMeta || !cropImageRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleMultiplier = cropMeta.baseScale * cropScale;
    const ratio = AVATAR_OUTPUT_SIZE / AVATAR_CROP_BOX_SIZE;
    const { x, y } = cropPosition;
    const drawWidth = cropMeta.width * scaleMultiplier * ratio;
    const drawHeight = cropMeta.height * scaleMultiplier * ratio;
    const drawX = (AVATAR_OUTPUT_SIZE - drawWidth) / 2 + x * ratio;
    const drawY = (AVATAR_OUTPUT_SIZE - drawHeight) / 2 + y * ratio;

    ctx.drawImage(cropImageRef.current, drawX, drawY, drawWidth, drawHeight);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setAvatarUploading(true);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const path = buildAvatarPath(userId, "avatar.jpg");
      const { error: uploadError } = await supabase.storage.from("avatar-profile").upload(path, file, { upsert: true });
      if (uploadError) {
        toast({ title: "Erro no upload", variant: "destructive" });
      } else {
        const { data: { publicUrl } } = supabase.storage.from("avatar-profile").getPublicUrl(path);
        await updateProfile({ avatar_url: publicUrl });
        toast({ title: "Foto atualizada" });
        resetCropState();
      }
      setAvatarUploading(false);
    }, "image/jpeg", 0.9);
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCropImage({ file, url: URL.createObjectURL(file) });
      setCropDialogOpen(true);
    }
  };

  const triggerFileDialog = () => fileInputRef.current?.click();

  if (!user) return <div className="p-10 text-center">Usuário não autenticado</div>;

  return (
    <MobileLayout>
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="sm:max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Ajustar Foto</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 items-center">
            <div 
              className="relative w-64 h-64 overflow-hidden rounded-[40px] border-2 border-primary bg-muted/20 cursor-grab active:cursor-grabbing"
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={() => setIsCropDragging(false)}
            >
              {cropImage && (
                <img
                  ref={cropImageRef}
                  src={cropImage.url}
                  alt="Crop preview"
                  onLoad={(e) => {
                    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                    const baseScale = Math.max(AVATAR_CROP_BOX_SIZE / w, AVATAR_CROP_BOX_SIZE / h);
                    setCropMeta({ width: w, height: h, baseScale });
                  }}
                  className="absolute pointer-events-none select-none max-w-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: cropMeta ? `${cropMeta.width * cropMeta.baseScale * cropScale}px` : 'auto',
                    height: cropMeta ? `${cropMeta.height * cropMeta.baseScale * cropScale}px` : 'auto',
                    transform: `translate(calc(-50% + ${cropPosition.x}px), calc(-50% + ${cropPosition.y}px))`
                  }}
                />
              )}
            </div>
            <Slider 
              min={1} max={3} step={0.01} value={[cropScale]} 
              onValueChange={([v]) => { setCropScale(v); setCropPosition(prev => clampPosition(prev, v)); }}
              className="w-full max-w-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCropState}>Cancelar</Button>
            <Button onClick={handleConfirmCrop} disabled={avatarUploading}>
              {avatarUploading ? <Loader2 className="animate-spin mr-2" size={16} /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col min-h-screen bg-background pb-28">
        {/* Header Hero (Referência do Usuário) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0D1A36] to-[#080E1C] px-6 pt-12 pb-8 rounded-b-[40px] shadow-lg">
          <div className="flex flex-row justify-between items-center mb-6">
            <h1 className="text-white text-2xl font-bold tracking-tight">Perfil</h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-sm hover:bg-white/20 transition-all active:scale-95"
            >
              {isEditing ? <ArrowLeft size={20} /> : <Edit size={18} />}
            </button>
          </div>

          <div className="flex flex-row items-center gap-4 mb-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-[24px] bg-primary/20 border-2 border-primary/40 flex items-center justify-center overflow-hidden shadow-inner">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt={displayName} />
                ) : (
                  <span className="text-primary text-2xl font-bold">{avatarInitials}</span>
                )}
              </div>
              <button 
                onClick={triggerFileDialog}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-lg border-2 border-[#0D1A36] flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
              >
                <Camera size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <h2 className="text-white text-xl font-bold truncate leading-tight">{profile?.full_name || "Piloto"}</h2>
              <div className="flex flex-row items-center gap-2 bg-accent/10 self-start rounded-lg px-2 py-1 border border-accent/20">
                <ShieldCheck size={12} className="text-accent" />
                <span className="text-accent text-[10px] font-bold uppercase tracking-wider">
                  {profile?.canac || "S/A"} · {profile?.tipo || "Tripulante"}
                </span>
              </div>
              <p className="text-white/60 text-xs font-medium truncate">{profile?.departamento || "Share Brasil"}</p>
            </div>
          </div>

          {/* Stats Card */}
          <div className="flex flex-row bg-card/95 border border-white/5 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
            <StatItem icon={Clock} label="Horas Totais" value={`${totalFlightHours.toFixed(1)}h`} />
            <div className="w-[1px] h-8 bg-border/30 self-center mx-2" />
            <StatItem icon={Star} label="Voos App" value={flightLogs.length} />
            <div className="w-[1px] h-8 bg-border/30 self-center mx-2" />
            <StatItem icon={AlertCircle} label="CTM Abertos" value={openCTMCount} />
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleAvatarUpload} />

        {/* Tabs Section */}
        <div className="px-5 mt-4 space-y-4">
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className={`grid w-full ${showTimeClock ? "grid-cols-5" : "grid-cols-4"} bg-card/50 border border-border/40 rounded-2xl p-1.5 h-auto mb-6 shadow-sm`}>
              <TabsTrigger value="dados" className="rounded-xl py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <User size={18} />
              </TabsTrigger>
              {showTimeClock && <TabsTrigger value="ponto" className="rounded-xl py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Timer size={18} />
              </TabsTrigger>}
              <TabsTrigger value="salario" className="rounded-xl py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <PiggyBank size={18} />
              </TabsTrigger>
              <TabsTrigger value="ferias" className="rounded-xl py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Calendar size={18} />
              </TabsTrigger>
              <TabsTrigger value="documentos" className="rounded-xl py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <FileText size={18} />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-0 space-y-6 outline-none pb-10">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.15em] ml-1">Informações Pessoais</h3>
                  <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                    <ProfileField 
                      label="Nome Completo" 
                      value={formState.full_name} 
                      onChangeText={(v) => setFormState(prev => ({ ...prev, full_name: v }))} 
                      icon={User} 
                      editable={isEditing} 
                    />
                    <ProfileField 
                      label="Nome de Exibição" 
                      value={formState.display_name} 
                      onChangeText={(v) => setFormState(prev => ({ ...prev, display_name: v }))} 
                      icon={UserIcon} 
                      editable={isEditing} 
                    />
                    <ProfileField 
                      label="Licença (ANAC)" 
                      value={formState.canac} 
                      onChangeText={(v) => setFormState(prev => ({ ...prev, canac: v }))} 
                      icon={CreditCard} 
                      editable={isEditing} 
                    />
                    <ProfileField 
                      label="Tipo de Licença" 
                      value={formState.tipo || ""} 
                      onChangeText={(v) => setFormState(prev => ({ ...prev, tipo: v as any }))} 
                      icon={ShieldCheck} 
                      editable={isEditing} 
                    />
                  </div>
                </div>

                {isEditing && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="pt-2"
                  >
                    <Button 
                      onClick={handleSaveEditableFields} 
                      disabled={isProfileBusy}
                      className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-7 shadow-lg shadow-primary/20 flex items-center justify-center gap-3 text-lg font-bold transition-all active:scale-[0.98]"
                    >
                      {isProfileBusy ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                      Salvar Alterações
                    </Button>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.15em] ml-1">Contatos e Endereço</h3>
                  <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                    <ProfileField 
                      label="Telefone" 
                      value={formState.phone} 
                      onChangeText={(v) => setFormState(prev => ({ ...prev, phone: v }))} 
                      icon={Briefcase} 
                      editable={isEditing} 
                    />
                    <ProfileField 
                      label="CPF" 
                      value={formState.cpf} 
                      onChangeText={(v) => setFormState(prev => ({ ...prev, cpf: v }))} 
                      icon={ShieldCheck} 
                      editable={isEditing} 
                    />
                    <ProfileField 
                      label="Endereço" 
                      value={formState.address} 
                      onChangeText={(v) => setFormState(prev => ({ ...prev, address: v }))} 
                      icon={Building2} 
                      editable={isEditing} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.15em] ml-1">Segurança</h3>
                  <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                        <Lock size={16} />
                      </div>
                      <span className="text-foreground font-bold text-sm">Atualizar Senha</span>
                    </div>
                    <div className="space-y-3">
                      <div className="relative">
                        <Input 
                          placeholder="Nova Senha"
                          type={showNewPassword ? "text" : "password"} 
                          value={newPassword} 
                          onChange={e => setNewPassword(e.target.value)} 
                          className="bg-background border-border/60 rounded-xl pr-10" 
                        />
                        <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-primary transition-colors">
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="relative">
                        <Input 
                          placeholder="Confirmar Senha"
                          type={showConfirmPassword ? "text" : "password"} 
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                          className="bg-background border-border/60 rounded-xl pr-10" 
                        />
                        <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-primary transition-colors">
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <Button 
                        onClick={handlePasswordChange} 
                        disabled={isChangingPassword || !newPassword || !confirmPassword} 
                        variant="secondary"
                        className="w-full rounded-xl py-5 font-bold tracking-wide"
                      >
                        {isChangingPassword ? <Loader2 className="animate-spin mr-2" size={16} /> : <Lock className="mr-2" size={16} />}
                        Mudar Senha
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {showTimeClock && <TabsContent value="ponto">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden">
                  <CardContent className="pt-6">
                    <TimeClockTab />
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>}

            <TabsContent value="salario" className="space-y-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <Card className="border-border/40 bg-card rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold">Histórico de Pagamentos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {salaryPayments.length === 0 ? (
                      <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                        <PiggyBank size={32} className="opacity-20" />
                        <p className="text-sm font-medium">Nenhum pagamento registrado</p>
                      </div>
                    ) : (
                      salaryPayments.map((s: any) => (
                        <div key={s.id} className="p-4 rounded-xl border border-border/30 bg-muted/5 space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-foreground">
                              {new Date(s.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                            </span>
                            {s.comprovante_url && (
                              <a href={s.comprovante_url} target="_blank" rel="noreferrer">
                                <Button variant="link" className="h-auto p-0 text-primary text-xs font-bold">Recibo</Button>
                              </a>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-medium">
                            {s.base_salary_holerite && <span>Base: R$ {Number(s.base_salary_holerite).toLocaleString('pt-BR')}</span>}
                            {s.horas_voo && <span>Horas: {s.horas_voo}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="ferias" className="space-y-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Disponíveis</p>
                    <p className="text-2xl font-black text-primary">{remainingVacation}d</p>
                  </div>
                  <div className="bg-secondary/5 border border-secondary/10 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Solicitados</p>
                    <p className="text-2xl font-black text-secondary">{vacationRequests.filter((r:any) => r.status === 'pending').length}d</p>
                  </div>
                </div>

                <Card className="border-border/40 bg-card rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Nova Solicitação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Início</Label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl border-border/60" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Término</Label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl border-border/60" />
                      </div>
                    </div>
                    <Button onClick={handleVacationRequest} className="w-full rounded-xl py-6 font-bold">Solicitar Férias</Button>
                  </CardContent>
                </Card>

                {vacationRequests.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Histórico</h4>
                    {vacationRequests.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-card shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{new Date(r.start_date).toLocaleDateString("pt-BR")} → {new Date(r.end_date).toLocaleDateString("pt-BR")}</p>
                            <p className="text-xs text-muted-foreground font-medium">{r.days} dias</p>
                          </div>
                        </div>
                        <Badge className="rounded-lg px-2 py-0.5" variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {r.status === 'approved' ? 'Aprovado' : r.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="documentos">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <EmployeeDocumentsManager userId={userId} userName={displayName} isAdmin={isAdmin} isFinanceiroMaster={roles.includes("financeiro_master")} isGestorMaster={isGestorMaster} currentUserId={user?.id} />
              </motion.div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col items-center py-10 gap-3 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
            <LayoutDashboard size={28} className="text-primary" />
            <div className="flex flex-col items-center">
              <span className="text-sm font-black uppercase tracking-[0.3em] text-foreground">Share Brasil</span>
              <span className="text-[10px] font-bold text-muted-foreground">v1.2.4 · Tripulantes</span>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
