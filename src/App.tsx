import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import EditRecurringPayment from "./pages/EditRecurringPayment";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import ChildMaintenanceGuide from "./pages/ChildMaintenanceGuide";
import ChildMaintenanceGuideApp from "./pages/ChildMaintenanceGuideApp";
import SupportAndGuidance from "./pages/SupportAndGuidance";
import ChildMaintenanceCalculator from "./pages/ChildMaintenanceCalculator";
import FinancialCoparentingTips from "./pages/FinancialCoparentingTips";
import SignUpInvited from "./pages/SignUpInvited";
import PaymentHistory from "./pages/PaymentHistory";
import Statement from "./pages/Statement";
import LetsChatTool from "./pages/LetsChatTool";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
              <Route path="/post-signup" element={<PostSignupOnboarding />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/edit-payment" element={<ProtectedRoute><EditRecurringPayment /></ProtectedRoute>} />
              <Route path="/payment-history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
              <Route path="/statement/:type" element={<ProtectedRoute><Statement /></ProtectedRoute>} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/resources/child-maintenance-guide" element={<ChildMaintenanceGuide />} />
              <Route path="/resources/child-maintenance-guide-app" element={<ProtectedRoute><ChildMaintenanceGuideApp /></ProtectedRoute>} />
              <Route path="/resources/child-maintenance-guide/what-is-child-maintenance" element={<Navigate to="/resources/child-maintenance-guide#article-1" replace />} />
              <Route path="/resources/child-maintenance-guide/who-pays" element={<Navigate to="/resources/child-maintenance-guide#article-2" replace />} />
              <Route path="/resources/child-maintenance-guide/how-to-set-up-payments" element={<Navigate to="/resources/child-maintenance-guide#article-3" replace />} />
              <Route path="/resources/child-maintenance-guide/shared-expenses" element={<Navigate to="/resources/child-maintenance-guide#article-4" replace />} />
              <Route path="/resources/child-maintenance-guide/rights-and-responsibilities" element={<Navigate to="/resources/child-maintenance-guide#article-5" replace />} />
              <Route path="/resources/support-and-guidance" element={<SupportAndGuidance />} />
              <Route path="/child-maintenance-calculator" element={<ChildMaintenanceCalculator />} />
              <Route path="/resources/financial-coparenting-tips" element={<FinancialCoparentingTips />} />
              <Route path="/resources/lets-chat-tool" element={<ProtectedRoute><LetsChatTool /></ProtectedRoute>} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
