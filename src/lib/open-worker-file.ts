import { apiClient } from "@/lib/api-client";

/** Abre arquivos protegidos sem expor o token da sessão em URLs. */
export async function openWorkerFile(endpoint: string): Promise<void> {
  const tab = window.open("about:blank", "_blank");
  if (!tab) throw new Error("Permita a abertura de uma nova aba para visualizar este arquivo.");
  try {
    const blob = await apiClient.getBlob(endpoint);
    const objectUrl = URL.createObjectURL(blob);
    tab.location.replace(objectUrl);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    tab.close();
    throw error;
  }
}
