import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { 
  Upload, Download, Trash2, FileText, Loader2, 
  Heart, Award, File, Eye, ChevronRight, Plus, 
  MoreVertical, ShieldCheck, Pencil
} from "lucide-react";

interface EmployeeDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
  category: string;
  arquivo_url: string;
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
  isAdmin?: boolean;
  isFinanceiroMaster?: boolean;
  isGestorMaster?: boolean;
  currentUserId?: string;
}

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function EmployeeDocumentsManager({
  userId,
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
  const [editingDocument, setEditingDocument] = useState<EmployeeDocument | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("Outros");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  
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
      const data = await apiClient.get<any[]>("/api/colaborador/documentos");
      setDocuments((data || []).map((doc) => ({
        ...doc,
        user_id: userId,
        file_name: doc.nome_arquivo,
        file_path: doc.arquivo_url,
        file_size: Number(doc.tamanho_bytes || 0),
        file_type: doc.mime_type || "application/octet-stream",
        created_at: doc.criado_em,
        category: doc.tipo_documento || "Outros",
      })));
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
      const formData = new FormData();
      formData.append("arquivo", selectedFile);
      formData.append("tipo_documento", uploadCategory);
      formData.append("nome_arquivo", selectedFile.name);
      await apiClient.postMultipart("/api/colaborador/documentos", formData);

      toast.success("Documento enviado com sucesso!");
      setSelectedFile(null);
      setUploadDialogOpen(false);
      setUploadCategory("Outros");
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent, documentId: string, fileName: string) => {
    e.stopPropagation();
    try {
      const data = await apiClient.getBlob(`/api/colaborador/documentos/${documentId}/arquivo`);
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
      const data = await apiClient.getBlob(`/api/colaborador/documentos/${doc.id}/arquivo`);
      setViewingDocument(doc);
      setDocumentUrl(URL.createObjectURL(data));
    } catch (error) {
      toast.error("Erro ao visualizar documento");
    }
  };

  const openEdit = (doc: EmployeeDocument) => {
    setEditingDocument(doc);
    setEditName(doc.file_name);
    setEditCategory(doc.category);
    setEditFile(null);
  };

  const handleEdit = async () => {
    if (!editingDocument || !editName.trim()) return;
    try {
      setSavingEdit(true);
      const formData = new FormData();
      formData.append("nome_arquivo", editName.trim());
      formData.append("categoria", editCategory);
      if (editFile) formData.append("arquivo", editFile);
      await apiClient.patchMultipart(`/api/colaborador/documentos/${editingDocument.id}`, formData);
      setEditingDocument(null);
      await loadDocuments();
      toast.success("Documento atualizado");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar documento");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!window.confirm("Deseja remover permanentemente este documento?")) return;

    try {
      setDeleting(docId);
      await apiClient.delete(`/api/colaborador/documentos/${docId}`);

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
      </div>

      {canEdit && (
        <Button 
          onClick={() => setUploadDialogOpen(true)} 
          className="mt-[14px] w-full rounded-[89px] h-14 px-[54px] gap-[14px] text-base font-[200] leading-[15px] min-h-0 overflow-hidden bg-[#0E2F6E] text-[#D3DAEE] shadow-sm hover:shadow-md hover:bg-[#0E2F6E] transition-all"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
          Adicionar Novo Documento
        </Button>
      )}

      {/* Horizontal Scroll Categories (Estilo iOS/Android Premium) */}
      <div className="flex overflow-x-auto no-scrollbar pb-2 pl-[17px] -ml-[11px] -mr-[20px] gap-[5px] snap-x">
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
                    onClick={(e) => handleDownload(e, doc.id, doc.file_name)}
                  >
                    <Download className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                  
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={(e) => { e.stopPropagation(); openEdit(doc); }}
                    >
                      <Pencil className="h-5 w-5" strokeWidth={1.5} />
                    </Button>
                  )}

                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(e, doc.id)}
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

      <Dialog open={!!editingDocument} onOpenChange={(open) => !open && setEditingDocument(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-border/50 shadow-xl gap-6">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-xl font-semibold">Editar Documento</DialogTitle>
            <DialogDescription className="text-sm">Atualize o nome, a categoria ou substitua o arquivo.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="document-name">Nome do arquivo</Label>
              <Input id="document-name" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={savingEdit} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={editCategory} onValueChange={setEditCategory} disabled={savingEdit}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES_OPTIONS.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-document-file">Substituir arquivo (opcional)</Label>
              <Input id="edit-document-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setEditFile(e.target.files?.[0] || null)} disabled={savingEdit} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingDocument(null)} disabled={savingEdit}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={savingEdit || !editName.trim()}>
              {savingEdit ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Salvar alterações
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
                onClick={(e) => viewingDocument && handleDownload(e, viewingDocument.id, viewingDocument.file_name)}
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
