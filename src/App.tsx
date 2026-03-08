import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { YearProvider } from "@/contexts/YearContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import LancamentosPage from "./pages/LancamentosPage";
import ContasReceberPage from "./pages/ContasReceberPage";
import ContasPagarPage from "./pages/ContasPagarPage";
import DREPage from "./pages/DREPage";
import CadastrosPage from "./pages/CadastrosPage";
import ImportacaoPage from "./pages/ImportacaoPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <YearProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
          </BrowserRouter>
        </YearProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
