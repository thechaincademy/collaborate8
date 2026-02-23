import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
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
import FinancialCoparentingTips from "./pages/FinancialCoparentingTips";
import SignUpInvited from "./pages/SignUpInvited";
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
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/post-signup" element={<PostSignupOnboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/edit-payment" element={<EditRecurringPayment />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/resources/child-maintenance-guide" element={<ChildMaintenanceGuide />} />
              <Route path="/resources/financial-coparenting-tips" element={<FinancialCoparentingTips />} />
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
