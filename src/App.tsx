import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { History } from "./pages/History";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { BlueprintDetail } from "./pages/BlueprintDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { state } = useApp();

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          state.auth.isAuthenticated ? 
          <Navigate to="/dashboard" replace /> : 
          <Landing />
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          state.auth.isAuthenticated ? 
          <Dashboard /> : 
          <Navigate to="/" replace />
        } 
      />
      <Route 
        path="/history" 
        element={
          state.auth.isAuthenticated ? 
          <History /> : 
          <Navigate to="/" replace />
        } 
      />
      <Route 
        path="/projects" 
        element={
          state.auth.isAuthenticated ? 
          <Projects /> : 
          <Navigate to="/" replace />
        } 
      />
      <Route 
        path="/project/:id" 
        element={
          state.auth.isAuthenticated ? 
          <ProjectDetail /> : 
          <Navigate to="/" replace />
        } 
      />
      <Route 
        path="/blueprint/:id" 
        element={
          state.auth.isAuthenticated ? 
          <BlueprintDetail /> : 
          <Navigate to="/" replace />
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
