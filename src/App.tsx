import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { GlobalLoader } from "@/components/ui/global-loader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/mobile/MobileLayout";

// Import páginas mobile
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import DiarioBordo from "./pages/DiarioBordo";
import PlanoVoo from "./pages/PlanoVoo";
import Perfil from "./pages/Perfil";
import RelatorioViagem from "./pages/financeiro/RelatorioViagem";
import GestaoCTM from "./pages/GestaoCTM";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    import("@/lib/pdfWorkerConfig")
      .then(({ configurePDFWorker }) => {
        configurePDFWorker();
      })
      .catch((err) => {
        console.warn('Aviso: Não foi possível configurar o worker de PDF.', err);
      });
  }, []);

  const renderProtected = (element: JSX.Element) => (
    <ProtectedRoute>{element}</ProtectedRoute>
  );

  const DiarioBordoWrapper = () => {
    const navigate = useNavigate();
    return <MobileLayout><DiarioBordo aircraftId="" onBack={() => navigate(-1)} /></MobileLayout>;
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LoadingProvider>
            <ViewModeProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <GlobalLoader />
                <HashRouter>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={renderProtected(<Index />)} />
                    <Route path="/diario-bordo" element={renderProtected(<DiarioBordoWrapper />)} />
                    <Route path="/plano-voo" element={renderProtected(<PlanoVoo />)} />
                    <Route path="/financeiro/viagem" element={renderProtected(<RelatorioViagem />)} />
                    <Route path="/manutencao/ctm" element={renderProtected(<GestaoCTM />)} />
                    <Route path="/perfil" element={renderProtected(<Perfil />)} />
                    <Route path="*" element={renderProtected(<NotFound />)} />
                  </Routes>
                </HashRouter>
              </TooltipProvider>
            </ViewModeProvider>
          </LoadingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
