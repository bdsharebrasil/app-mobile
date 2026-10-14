import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Upload, Download, Trash2, FileText, Loader2, 
  Heart, Award, File, Eye, ChevronRight, Plus, 
  MoreVertical, ShieldCheck
} from "lucide-react";

interface EmployeeDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  category: string;
}

type DocumentCategory = "Todos" | "Documentos Pessoais" | "Atestados Médicos" | "Documentos Financeiros" | "Académicos/Certificados" | "Outros";

const CATEGORIES_OPTIONS = [
  { value: "Documentos Pessoais", label: "Pessoais" },
  { value: "Atestados Médicos", label: "Médicos" },
  { value: "Documentos Financeiros", label: "Financeiros" },
  { value: "Académicos/Certificados", label: "Acadêmicos" },
  { value: "Outros", label: "Outros" },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Documentos Pessoais": return <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />;
    case "Atestados Médicos": return <Heart className="h-5 w-5" strokeWidth={1.5} />;
    case "Documentos Financeiros": return <File className="h-5 w-5" strokeWidth={1.5} />;
    case "Académicos/Certificados": return <Award className="h-5 w-5" strokeWidth={1.5} />;
    default: return <FileText className="h-5 w-5" strokeWidth={1.5} />;
  }
};

interface EmployeeDocumentsManagerProps {
  userId: string;
  userName: string;
  isAdmin?: boolean;
  isFinanceiroMaster?: boolean;
  isGestorMaster?: boolean;
  currentUserId?: string;
}

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function EmployeeDocumentsManager({
  userId,
  userName,
  isAdmin = false,
  isFinanceiroMaster = false,
  isGestorMaster = false,
  currentUserId
}: EmployeeDocumentsManagerProps) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // UI States
  const [activeFilter, setActiveFilter] = useState<DocumentCategory>("Todos");
  const [uploadCategory, setUploadCategory] = useState<string>("Outros");
  const [viewingDocument, setViewingDocument] = useState<EmployeeDocument | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  const canEdit = isAdmin || isFinanceiroMaster || isGestorMaster || currentUserId === userId;

  useEffect(() => {
    loadDocuments();
  }, [userId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enrichedData = await Promise.all(
        (data || []).map(async (doc) => {
          if (doc.uploaded_by && !doc.uploaded_by_name) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("full_name")
              .eq("id", doc.uploaded_by)
              .single();
            return { ...doc, uploaded_by_name: profile?.full_name || "Desconhecido" };
          }
          return doc;
        })
      );

      setDocuments(enrichedData || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Formato não permitido. Use: PDF, Imagem, Word");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Arquivo muito grande. Máximo 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selecione um arquivo");
      return;
    }

    try {
      setUploading(true);
      const fileExt = selectedFile.name.split(".").pop() || '';
      const timestamp = Date.now();
      const sanitizedCategory = uploadCategory
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');
      const fileName = `${userId}/${sanitizedCategory}/${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents_colaborador")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();

      const { error: dbError } = await supabase
        .from("user_documents")
        .insert({
          user_id: userId,
          file_name: selectedFile.name,
          file_path: fileName,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          uploaded_by: user?.id,
          category: uploadCategory,
          created_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      toast.success("Documento enviado com sucesso!");
      setSelectedFile(null);
      setUploadDialogOpen(false);
      setUploadCategory("Outros");
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.code === "PGRST116" ? "Erro de permissão" : "Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent, filePath: string, fileName: string) => {
    e.stopPropagation();
    try {
      const { data, error } = await supabase.storage
        .from("documents_colaborador")
        .download(filePath);

      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Erro ao baixar documento");
    }
  };

  const handleViewDocument = async (doc: EmployeeDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents_colaborador")
        .createSignedUrl(doc.file_path, 60 * 60);

      if (error) throw error;
      setViewingDocument(doc);
      setDocumentUrl(data.signedUrl);
    } catch (error) {
      toast.error("Erro ao visualizar documento");
    }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string, filePath: string) => {
    e.stopPropagation();
    if (!window.confirm("Deseja remover permanentemente este documento?")) return;

    try {
      setDeleting(docId);
      const { error: storageError } = await supabase.storage
        .from("documents_colaborador")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("user_documents")
        .delete()
        .eq("id", docId);

      if (dbError) throw dbError;

      setDocuments(documents.filter(d => d.id !== docId));
      toast.success("Documento removido");
    } catch (error) {
      toast.error("Erro ao remover documento");
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const filteredDocuments = activeFilter === "Todos" 
    ? documents 
    : documents.filter(doc => doc.category === activeFilter);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col space-y-6 pb-20">
      {/* Header Premium Nativo */}
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Documentos</h2>
        <p className="text-sm text-muted-foreground">Repositório digital de {userName.split(' ')[0]}</p>
      </div>

      {canEdit && (
        <Button 
          onClick={() => setUploadDialogOpen(true)} 
          className="w-full rounded-2xl h-14 text-base font-medium shadow-sm hover:shadow-md transition-all gap-2"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
          Adicionar Novo Documento
        </Button>
      )}

      {/* Horizontal Scroll Categories (Estilo iOS/Android Premium) */}
      <div className="flex overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 gap-2 snap-x">
        <button
          onClick={() => setActiveFilter("Todos")}
          className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
            activeFilter === "Todos" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          Todos
        </button>
        {CATEGORIES_OPTIONS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveFilter(cat.value as DocumentCategory)}
            className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
              activeFilter === cat.value 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Lista de Documentos */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-muted/20 rounded-3xl border border-dashed border-border/50">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-base font-medium text-foreground">Nenhum documento</p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeFilter === "Todos" ? "Esta pasta está vazia." : `Nenhum documento na categoria ${activeFilter}.`}
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleViewDocument(doc)}
                className="group flex items-center justify-between p-4 bg-card rounded-2xl border border-border/40 shadow-sm hover:shadow-md hover:border-border transition-all cursor-pointer active:scale-[0.98]"
              >
                {/* Ícone e Info do Documento */}
                <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                    {getCategoryIcon(doc.category)}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                    <p className="font-medium text-sm text-foreground truncate">
                      {doc.file_name}
                    </p>
                    <div className="flex items-center text-[13px] text-muted-foreground">
                      <span>{new Date(doc.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="mx-1.5 opacity-50">•</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                    </div>
                  </div>
                </div>

                {/* Ações (Mobile Friendly) */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={(e) => handleDownload(e, doc.file_path, doc.file_name)}
                  >
                    <Download className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                  
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(e, doc.id, doc.file_path)}
                      disabled={deleting === doc.id}
                    >
                      {deleting === doc.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Trash2 className="h-5 w-5" strokeWidth={1.5} />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de Upload (Estilo Bottom Sheet / Modal Premium) */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-border/50 shadow-xl gap-6">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-xl font-semibold">Novo Documento</DialogTitle>
            <DialogDescription className="text-sm">
              Adicione arquivos ao repositório digital do tripulante.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Categoria do arquivo</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory} disabled={uploading}>
                <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/20">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  {CATEGORIES_OPTIONS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="rounded-lg">
                      {cat.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="Outros" className="rounded-lg">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Arquivo</Label>
              <div className="relative">
                <Input
                  id="document-file"
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`h-24 w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${selectedFile ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/20 hover:bg-muted/40'}`}>
                  {selectedFile ? (
                    <div className="flex flex-col items-center text-center px-4">
                      <FileText className="h-6 w-6 text-primary mb-1" strokeWidth={1.5} />
                      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Upload className="h-6 w-6 mb-2" strokeWidth={1.5} />
                      <span className="text-sm">Toque para escolher</span>
                      <span className="text-[11px] mt-1 opacity-70">PDF, JPG, PNG, DOC (Máx. 10MB)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFile(null);
              }}
              disabled={uploading}
              className="w-full sm:w-auto h-12 rounded-xl border-border/50 font-medium"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="w-full sm:w-auto h-12 rounded-xl font-medium"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                "Fazer Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização */}
      <Dialog open={!!viewingDocument} onOpenChange={(open) => !open && setViewingDocument(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col rounded-3xl border-border/40 shadow-2xl bg-card">
          <div className="flex items-center justify-between p-4 border-b border-border/40 shrink-0">
            <div className="flex flex-col min-w-0 pr-4">
              <DialogTitle className="text-base font-semibold truncate">
                {viewingDocument?.file_name}
              </DialogTitle>
              {viewingDocument && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(viewingDocument.created_at).toLocaleDateString("pt-BR")} • {formatFileSize(viewingDocument.file_size)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={(e) => viewingDocument && handleDownload(e, viewingDocument.file_path, viewingDocument.file_name)}
              >
                <Download className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4">
            {documentUrl && viewingDocument ? (
              viewingDocument.file_type === "application/pdf" ? (
                <iframe
                  src={documentUrl}
                  className="w-full h-full rounded-xl bg-white shadow-sm"
                  title={viewingDocument.file_name}
                />
              ) : (
                <img
                  src={documentUrl}
                  alt={viewingDocument.file_name}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-sm"
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm font-medium">Carregando arquivo...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
