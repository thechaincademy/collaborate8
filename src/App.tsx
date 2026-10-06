import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieConsent from "@/components/CookieConsent";
import Landing from "./pages/Landing";
import Splash from "./pages/Splash";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import PostSignupOnboarding from "./pages/PostSignupOnboarding";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotificationSettings from "./pages/NotificationSettings";

import EditRecurringPayment from "./pages/EditRecurringPayment";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import FAQ from "./pages/FAQ";
import CommunicationGuide from "./pages/CommunicationGuide";
import CostOfConflict from "./pages/CostOfConflict";
import TaxAndBenefits from "./pages/TaxAndBenefits";
import About from "./pages/About";
import Podcast from "./pages/Podcast";
import ChildMaintenanceGuide from "./pages/ChildMaintenanceGuide";
import ChildMaintenanceGuideApp from "./pages/ChildMaintenanceGuideApp";
import ChildMaintenanceCalculator from "./pages/ChildMaintenanceCalculator";
import FinancialCoparentingTips from "./pages/FinancialCoparentingTips";
import SignUpInvited from "./pages/SignUpInvited";
import PaymentHistory from "./pages/PaymentHistory";
import Statement from "./pages/Statement";
import CoparentBankAccount from "./pages/CoparentBankAccount";
import LetsChatTool from "./pages/LetsChatTool";
import SolanaProvider from "@/components/solana/SolanaProvider";
import SolanaPaymentAudit from "./pages/SolanaPaymentAudit";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import OAuthConsent from "./pages/OAuthConsent";
import ResetPassword from "./pages/ResetPassword";
import InAppShell from "@/components/layout/InAppShell";
import NotFound from "./pages/NotFound";

const DashboardTabRedirect = () => {
  const { tab } = useParams();
  return <Navigate to={`/dashboard?tab=${tab ?? "home"}`} replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SolanaProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/splash" element={<Splash />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signup/invited" element={<SignUpInvited />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/post-signup" element={<PostSignupOnboarding />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              {["maintenance", "expenses", "chat", "benefits", "resources", "documents"].map((t) => (
                <Route key={t} path={`/${t}`} element={<Navigate to={`/dashboard?tab=${t}`} replace />} />
              ))}
              <Route path="/dashboard/:tab" element={<DashboardTabRedirect />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/cost-of-conflict" element={<ProtectedRoute><InAppShell><CostOfConflict /></InAppShell></ProtectedRoute>} />
              <Route path="/tax-and-benefits" element={<Navigate to="/resources/child-maintenance-guide-app" replace />} />
              <Route path="/communication-guide" element={<Navigate to="/resources/child-maintenance-guide-app" replace />} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />

              <Route path="/edit-payment" element={<ProtectedRoute><EditRecurringPayment /></ProtectedRoute>} />
              <Route path="/payment-history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
              <Route path="/coparent-bank-account" element={<ProtectedRoute><CoparentBankAccount /></ProtectedRoute>} />
              <Route path="/statement/:type" element={<ProtectedRoute><Statement /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/podcast" element={<Podcast />} />
          <Route path="/resources/child-maintenance-guide" element={<ChildMaintenanceGuide />} />
              <Route path="/resources/child-maintenance-guide-app" element={<ProtectedRoute><InAppShell><ChildMaintenanceGuideApp /></InAppShell></ProtectedRoute>} />
              <Route path="/resources/child-maintenance-guide/what-is-child-maintenance" element={<Navigate to="/resources/child-maintenance-guide#article-1" replace />} />
              <Route path="/resources/child-maintenance-guide/who-pays" element={<Navigate to="/resources/child-maintenance-guide#article-2" replace />} />
              <Route path="/resources/child-maintenance-guide/how-to-set-up-payments" element={<Navigate to="/resources/child-maintenance-guide#article-3" replace />} />
              <Route path="/resources/child-maintenance-guide/shared-expenses" element={<Navigate to="/resources/child-maintenance-guide#article-4" replace />} />
              <Route path="/resources/child-maintenance-guide/rights-and-responsibilities" element={<Navigate to="/resources/child-maintenance-guide#article-5" replace />} />
              <Route path="/resources/support-and-guidance" element={<Navigate to="/resources/child-maintenance-guide#money-help" replace />} />
              <Route path="/app/child-maintenance-calculator" element={<ProtectedRoute><InAppShell title="Calculator"><ChildMaintenanceCalculator embedded /></InAppShell></ProtectedRoute>} />
              <Route path="/child-maintenance-calculator" element={<ChildMaintenanceCalculator />} />
              <Route path="/resources/financial-coparenting-tips" element={<FinancialCoparentingTips />} />
              <Route path="/resources/lets-chat-tool" element={<ProtectedRoute><InAppShell><LetsChatTool /></InAppShell></ProtectedRoute>} />
              <Route path="/internal/solana-audit" element={<ProtectedRoute><SolanaPaymentAudit /></ProtectedRoute>} />
              <Route path="/internal/solana-audit/:arrangementId" element={<ProtectedRoute><SolanaPaymentAudit /></ProtectedRoute>} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
          </BrowserRouter>
         </TooltipProvider>
        </SolanaProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
