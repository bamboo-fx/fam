import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GuestRoute } from "./components/GuestRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import VerifyOtp from "./pages/VerifyOtp";
import PatientIntake from "./pages/PatientIntake";
import QuickMatch from "./pages/QuickMatch";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />

          {/* Auth routes - only for guests */}
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/verify-otp" element={<GuestRoute><VerifyOtp /></GuestRoute>} />

          {/* Protected routes - require login */}
          <Route path="/intake" element={<ProtectedRoute><QuickMatch /></ProtectedRoute>} />
          <Route path="/test-intake" element={<ProtectedRoute><PatientIntake /></ProtectedRoute>} />
          <Route path="/results/:patientId" element={<ProtectedRoute><Results /></ProtectedRoute>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
