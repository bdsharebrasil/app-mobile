import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, Save, Edit, User as UserIcon, Calendar, AlertCircle, CheckCircle, Clock, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Star, Briefcase, Building2, User, CreditCard, LayoutDashboard, FileText, PiggyBank, Timer, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";
import { EmployeeDocumentsManager } from "@/components/profile/EmployeeDocumentsManager";
import { TimeClockTab } from "@/components/profile/TimeClockTab";

// --- Subcomponentes de Estilo (Padrão Native Premium) ---

const ProfileFieldGroup = ({ children, title }: { children: React.ReactNode, title?: string }) => (
  <div className="mb-6">
    {title && <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-4">{title}</h3>}
    <div className="bg-card rounded-2xl border border-border/40 overflow-hidden shadow-sm divide-y divide-border/40">
      {children}
    </div>
  </div>
);

const ProfileField = ({ label, value, icon: Icon, editable, onChangeText, placeholder, type = "text" }: { 
  label: string, 
  value: string, 
  icon: any, 
  editable: boolean, 
  onChangeText: (v: string) => void,
  placeholder?: string,
  type?: string
}) => (
  <div className="flex items-center px-4 py-3 bg-card transition-colors group">
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3 shrink-0">
      <Icon size={16} strokeWidth={2} />
    </div>
    <div className="flex-1 min-w-0 flex flex-col justify-center">
      <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{label}</p>
      {editable ? (
        <input
          type={type}
          className="w-full bg-transparent text-foreground text-[15px] font-medium focus:outline-none placeholder:text-muted-foreground/30"
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <p className="text-foreground text-[15px] font-medium truncate">{value || "Não informado"}</p>
      )}
    </div>
    {editable && <Edit size={14} className="text-muted-foreground/40" />}
  </div>
);

const StatCard = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) => (
  <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 shadow-sm flex-1">
    <div className="text-primary mb-1">
      <Icon size={20} strokeWidth={1.5} />
    </div>
    <span className="text-foreground text-xl font-bold tracking-tight leading-none">{value}</span>
    <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide text-center mt-1">
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

const buildAvatarPath = (userId: string, fileName: string) => {
  const extension = fileName.split(".").pop();
  const uniqueId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return extension ? `${userId}/${uniqueId}.${extension}` : `${userId}/${uniqueId}`;
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
    updateProfile,
    isUpdating
  } = useUserProfile(user);

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
      const { data, error } = await supabase.from("maintenance_reports").select("*").eq("status", "open");
      if (error) return [];
      return data;
    }
  });

  const totalFlightHours = useMemo(() => {
    return flightLogs.reduce((acc: number, log: any) => acc + (Number(log.flight_time_hours) || 0) + (Number(log.flight_time_minutes) || 0) / 60, 0);
  }, [flightLogs]);

  const openCTMCount = maintenanceReports.length;

  const [formState, setFormState] = useState<FormState>({
    full_name: "", display_name: "", phone: "", address: "", tipo: "", cpf: "", rg: "", birth_date: "", bank_name: "", bank_agency: "", bank_account: "", bank_pix: "", canac: ""
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
        tipo: (p?.tipo_licenca as any) ?? "",
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
    return () => { if (cropImage) URL.revokeObjectURL(cropImage.url); };
  }, [cropImage]);

  const displayName = useMemo(() => formState.display_name || formState.full_name || profile?.full_name || user?.email || "Usuário", [formState.display_name, formState.full_name, profile?.full_name, user?.email]);
  const avatarInitials = useMemo(() => getInitials(displayName), [displayName]);
  const isProfileBusy = isUpdating || avatarUploading;
  const userId = user?.id ?? "";

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

  const workingMonths = useMemo(() => {
    const admission = (profile as any)?.admission_date as string | undefined;
    if (!admission) return 0;
    const start = new Date(admission);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
  }, [profile]);

  const availableVacationDays = workingMonths < 12 ? 0 : 30;
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
    
    const { error } = await supabase.from("vacation_requests" as any).insert({ user_id: userId, start_date: startDate, end_date: endDate, days, status: "pending" });

    if (error) toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
    else { toast({ title: "Solicitação enviada" }); setStartDate(""); setEndDate(""); refetchVacations(); }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) { toast({ title: "Senhas não conferem", variant: "destructive" }); return; }
    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);
    if (error) toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    else { toast({ title: "Senha alterada com sucesso" }); setNewPassword(""); setConfirmPassword(""); }
  };

  const handleSaveEditableFields = async () => {
    try { await updateProfile(formState); setIsEditing(false); toast({ title: "Perfil atualizado com sucesso" }); } 
    catch (error) { toast({ title: "Erro ao atualizar", variant: "destructive" }); }
  };

  const resetCropState = useCallback(() => {
    setCropDialogOpen(false); setCropImage(null); setCropMeta(null); setCropScale(DEFAULT_CROP_SCALE); setCropPosition({ x: 0, y: 0 }); setIsCropDragging(false);
  }, []);

  const clampPosition = useCallback((position: { x: number; y: number }, scaleOverride?: number) => {
    if (!cropMeta) return position;
    const scale = scaleOverride ?? cropScale;
    const scaledWidth = cropMeta.width * cropMeta.baseScale * scale;
    const scaledHeight = cropMeta.height * cropMeta.baseScale * scale;
    const maxOffsetX = Math.max((scaledWidth - AVATAR_CROP_BOX_SIZE) / 2, 0);
    const maxOffsetY = Math.max((scaledHeight - AVATAR_CROP_BOX_SIZE) / 2, 0);
    return { x: Math.min(Math.max(position.x, -maxOffsetX), maxOffsetX), y: Math.min(Math.max(position.y, -maxOffsetY), maxOffsetY) };
  }, [cropMeta, cropScale]);

  const handleCropPointerDown = (e: React.PointerEvent) => {
    if (!cropMeta) return;
    setIsCropDragging(true); cropDragStart.current = { x: e.clientX, y: e.clientY };
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
    canvas.width = AVATAR_OUTPUT_SIZE; canvas.height = AVATAR_OUTPUT_SIZE;
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
      if (uploadError) toast({ title: "Erro no upload", variant: "destructive" });
      else {
        const { data: { publicUrl } } = supabase.storage.from("avatar-profile").getPublicUrl(path);
        await updateProfile({ avatar_url: publicUrl });
        toast({ title: "Foto atualizada" }); resetCropState();
      }
      setAvatarUploading(false);
    }, "image/jpeg", 0.9);
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { setCropImage({ file, url: URL.createObjectURL(file) }); setCropDialogOpen(true); }
  };

  const triggerFileDialog = () => fileInputRef.current?.click();

  if (!user) return <div className="p-10 text-center font-medium text-muted-foreground">Usuário não autenticado</div>;

  return (
    <MobileLayout>
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="sm:max-w-xl bg-card border-border rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-center font-bold">Ajustar Foto</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 items-center my-4">
            <div 
              className="relative w-64 h-64 overflow-hidden rounded-full border border-border/50 bg-muted/30 cursor-grab active:cursor-grabbing"
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
                    left: '50%', top: '50%',
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
              className="w-full max-w-[200px]"
            />
          </div>
          <DialogFooter className="flex-row gap-3 justify-center sm:justify-center">
            <Button variant="outline" onClick={resetCropState} className="flex-1 rounded-xl h-12 font-semibold">Cancelar</Button>
            <Button onClick={handleConfirmCrop} disabled={avatarUploading} className="flex-1 rounded-xl h-12 font-semibold bg-primary text-primary-foreground">
              {avatarUploading ? <Loader2 className="animate-spin" size={18} /> : "Concluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col min-h-screen bg-background pb-28">
        
        {/* Overlapping Header Premium */}
        <div className="bg-[#0A111F] pt-14 pb-20 px-6 relative">
          <div className="flex flex-row justify-between items-center mb-8">
            <h1 className="text-white text-3xl font-bold tracking-tight">Perfil</h1>
            <button
              onClick={() => isEditing ? handleSaveEditableFields() : setIsEditing(true)}
              className="text-primary font-semibold text-[15px] active:opacity-70 transition-opacity flex items-center gap-1"
            >
              {isEditing ? (
                <>{isProfileBusy ? <Loader2 className="animate-spin" size={16}/> : "Concluir"}</>
              ) : "Editar"}
            </button>
          </div>

          <div className="flex flex-row items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-muted/20 border border-white/10 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt={displayName} />
                ) : (
                  <span className="text-white/60 text-2xl font-semibold">{avatarInitials}</span>
                )}
              </div>
              <button 
                onClick={triggerFileDialog}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full border-[3px] border-[#0A111F] flex items-center justify-center text-white active:scale-95 transition-transform"
              >
                <Camera size={14} />
              </button>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <h2 className="text-white text-xl font-bold truncate tracking-tight">{profile?.full_name || "Piloto"}</h2>
              <p className="text-white/60 text-[13px] mt-0.5 mb-1.5">{profile?.departamento || "Share Brasil"}</p>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] text-white/80 border-white/20 bg-white/5 font-semibold px-2 py-0">
                  {profile?.tipo || "Tripulante"}
                </Badge>
                {profile?.canac && (
                  <Badge variant="outline" className="text-[10px] text-white/80 border-white/20 bg-white/5 font-semibold px-2 py-0">
                    ANAC: {profile?.canac}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleAvatarUpload} />

        {/* Floating Stats */}
        <div className="px-5 -mt-8 relative z-10">
          <div className="flex gap-3">
            <StatCard icon={Clock} label="Horas Totais" value={`${totalFlightHours.toFixed(1)}h`} />
            <StatCard icon={Star} label="Voos App" value={flightLogs.length} />
            <StatCard icon={AlertCircle} label="CTM Abertos" value={openCTMCount} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-5 mt-6 space-y-4">
          <Tabs defaultValue="dados" className="w-full">
            
            {/* Segmented Control Nativel-like */}
            <TabsList className="flex w-full bg-muted/40 p-1 rounded-[14px] h-auto items-center justify-between mb-6 shadow-inner">
              <TabsTrigger className="flex-1 rounded-[10px] py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all" value="dados">
                <User size={18} />
              </TabsTrigger>
              {showTimeClock && (
                <TabsTrigger className="flex-1 rounded-[10px] py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all" value="ponto">
                  <Timer size={18} />
                </TabsTrigger>
              )}
              <TabsTrigger className="flex-1 rounded-[10px] py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all" value="salario">
                <PiggyBank size={18} />
              </TabsTrigger>
              <TabsTrigger className="flex-1 rounded-[10px] py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all" value="ferias">
                <Calendar size={18} />
              </TabsTrigger>
              <TabsTrigger className="flex-1 rounded-[10px] py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all" value="documentos">
                <FileText size={18} />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-0 outline-none pb-10">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                <ProfileFieldGroup title="Informações Pessoais">
                  <ProfileField label="Nome Completo" value={formState.full_name} onChangeText={v => setFormState(p => ({ ...p, full_name: v }))} icon={User} editable={isEditing} />
                  <ProfileField label="Nome de Exibição" value={formState.display_name} onChangeText={v => setFormState(p => ({ ...p, display_name: v }))} icon={UserIcon} editable={isEditing} />
                  <ProfileField label="Licença (ANAC)" value={formState.canac} onChangeText={v => setFormState(p => ({ ...p, canac: v }))} icon={CreditCard} editable={isEditing} />
                  <ProfileField label="Tipo de Licença" value={formState.tipo || ""} onChangeText={v => setFormState(p => ({ ...p, tipo: v as any }))} icon={ShieldCheck} editable={isEditing} />
                </ProfileFieldGroup>

                <ProfileFieldGroup title="Contatos e Endereço">
                  <ProfileField label="Telefone" value={formState.phone} onChangeText={v => setFormState(p => ({ ...p, phone: v }))} icon={Briefcase} type="tel" editable={isEditing} />
                  <ProfileField label="CPF" value={formState.cpf} onChangeText={v => setFormState(p => ({ ...p, cpf: v }))} icon={ShieldCheck} type="numeric" editable={isEditing} />
                  <ProfileField label="Endereço" value={formState.address} onChangeText={v => setFormState(p => ({ ...p, address: v }))} icon={Building2} editable={isEditing} />
                </ProfileFieldGroup>

                <ProfileFieldGroup title="Segurança">
                  <div className="p-4 bg-card">
                    <p className="text-[13px] font-medium text-foreground mb-4">Atualizar Senha de Acesso</p>
                    <div className="space-y-3">
                      <div className="relative">
                        <Input 
                          placeholder="Nova Senha" type={showNewPassword ? "text" : "password"} 
                          value={newPassword} onChange={e => setNewPassword(e.target.value)} 
                          className="bg-background/50 h-12 rounded-xl pr-10 border-border/60" 
                        />
                        <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1">
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="relative">
                        <Input 
                          placeholder="Confirmar Senha" type={showConfirmPassword ? "text" : "password"} 
                          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} 
                          className="bg-background/50 h-12 rounded-xl pr-10 border-border/60" 
                        />
                        <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1">
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <Button 
                        onClick={handlePasswordChange} disabled={isChangingPassword || !newPassword || !confirmPassword} 
                        variant="secondary" className="w-full h-12 rounded-xl font-semibold mt-2"
                      >
                        {isChangingPassword ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                        Salvar Nova Senha
                      </Button>
                    </div>
                  </div>
                </ProfileFieldGroup>

              </motion.div>
            </TabsContent>

            {showTimeClock && (
              <TabsContent value="ponto">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="border-border/40 bg-card rounded-2xl shadow-sm overflow-hidden">
                    <CardContent className="pt-6">
                      <TimeClockTab />
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            )}

            <TabsContent value="salario" className="space-y-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">Histórico de Pagamentos</h3>
                <div className="space-y-3">
                  {salaryPayments.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground bg-card rounded-2xl border border-border/40">
                      <PiggyBank size={32} className="opacity-30 mx-auto mb-2" />
                      <p className="text-[15px] font-medium">Nenhum pagamento registrado</p>
                    </div>
                  ) : (
                    salaryPayments.map((s: any) => (
                      <div key={s.id} className="p-4 rounded-2xl border border-border/40 bg-card flex flex-col gap-3 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-[15px] capitalize text-foreground">
                            {new Date(s.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                          </span>
                          {s.comprovante_url && (
                            <a href={s.comprovante_url} target="_blank" rel="noreferrer" className="text-primary text-[13px] font-semibold bg-primary/10 px-3 py-1.5 rounded-lg active:opacity-70 transition-opacity">
                              Ver Recibo
                            </a>
                          )}
                        </div>
                        <div className="flex gap-4 border-t border-border/40 pt-3">
                          {s.base_salary_holerite && (
                            <div>
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Base</p>
                              <p className="text-sm font-medium">R$ {Number(s.base_salary_holerite).toLocaleString('pt-BR')}</p>
                            </div>
                          )}
                          {s.horas_voo && (
                            <div>
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Horas Voadas</p>
                              <p className="text-sm font-medium">{s.horas_voo}h</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="ferias" className="space-y-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border/40 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Disponíveis</p>
                    <p className="text-2xl font-bold text-foreground">{remainingVacation} <span className="text-sm font-medium text-muted-foreground">dias</span></p>
                  </div>
                  <div className="bg-card border border-border/40 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Solicitados</p>
                    <p className="text-2xl font-bold text-foreground">{vacationRequests.filter((r:any) => r.status === 'pending').length} <span className="text-sm font-medium text-muted-foreground">dias</span></p>
                  </div>
                </div>

                <div className="bg-card border border-border/40 rounded-2xl shadow-sm p-4">
                  <h3 className="text-[15px] font-semibold text-foreground mb-4">Nova Solicitação</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Data Início</Label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-12 rounded-xl bg-background/50 border-border/60" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Data Término</Label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-12 rounded-xl bg-background/50 border-border/60" />
                      </div>
                    </div>
                    <Button onClick={handleVacationRequest} className="w-full h-12 rounded-xl font-semibold bg-primary text-primary-foreground">
                      Enviar Solicitação
                    </Button>
                  </div>
                </div>

                {vacationRequests.length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">Histórico de Solicitações</h3>
                    <div className="space-y-3">
                      {vacationRequests.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0">
                              <Calendar size={18} />
                            </div>
                            <div>
                              <p className="text-[14px] font-semibold text-foreground">
                                {new Date(r.start_date).toLocaleDateString("pt-BR", {day: '2-digit', month: '2-digit'})} a {new Date(r.end_date).toLocaleDateString("pt-BR", {day: '2-digit', month: '2-digit'})}
                              </p>
                              <p className="text-[13px] text-muted-foreground font-medium">{r.days} dias solicitados</p>
                            </div>
                          </div>
                          <Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'} className="rounded-md px-2.5 py-1 text-[11px] font-semibold">
                            {r.status === 'approved' ? 'Aprovado' : r.status === 'rejected' ? 'Rejeitado' : 'Em análise'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="documentos">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="bg-card border border-border/40 rounded-2xl p-1 shadow-sm">
                  <EmployeeDocumentsManager userId={userId} userName={displayName} isAdmin={isAdmin} isFinanceiroMaster={roles.includes("financeiro_master")} isGestorMaster={isGestorMaster} currentUserId={user?.id} />
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col items-center py-10 gap-2 opacity-40 hover:opacity-100 transition-opacity">
            <LayoutDashboard size={24} className="text-muted-foreground" />
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Share Brasil</span>
              <p className="text-[10px] font-medium text-muted-foreground/60 mt-0.5">Versão 1.2.4 · Tripulantes</p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
