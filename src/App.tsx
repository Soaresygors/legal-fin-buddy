import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { YearProvider } from "@/contexts/YearContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LancamentosPage = lazy(() => import("./pages/LancamentosPage"));
const ContasReceberPage = lazy(() => import("./pages/ContasReceberPage"));
const ContasPagarPage = lazy(() => import("./pages/ContasPagarPage"));
const DREPage = lazy(() => import("./pages/DREPage"));
const CadastrosPage = lazy(() => import("./pages/CadastrosPage"));
const ImportacaoPage = lazy(() => import("./pages/ImportacaoPage"));
const PlanilhasModeloPage = lazy(() => import("./pages/PlanilhasModeloPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <YearProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/registro" element={<RegisterPage />} />
                <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
                <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/lancamentos" element={<LancamentosPage />} />
                    <Route path="/contas-receber" element={<ContasReceberPage />} />
                    <Route path="/contas-pagar" element={<ContasPagarPage />} />
                    <Route path="/importacao" element={<ImportacaoPage />} />
                    <Route path="/planilhas-modelo" element={<PlanilhasModeloPage />} />
                    <Route path="/dre" element={<DREPage />} />
                    <Route path="/cadastros" element={<Navigate to="/cadastros/socios" replace />} />
                    <Route path="/cadastros/socios" element={<CadastrosPage />} />
                    <Route path="/cadastros/clientes" element={<CadastrosPage />} />
                    <Route path="/cadastros/plano-contas" element={<CadastrosPage />} />
                    <Route path="/cadastros/centros-custo" element={<CadastrosPage />} />
                    <Route path="/cadastros/contas-bancarias" element={<CadastrosPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </YearProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
