// Build trigger - force refresh
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DevTools from "./pages/DevTools";
import DynamicDashboard from "./pages/DynamicDashboard";
import FileUpload from "./pages/FileUpload";
import LoginPage from "./pages/LoginPage";
import UserManagementPage from "./pages/UserManagementPage";
import NotFound from "./pages/NotFound";

// Очищаем кэш браузера при загрузке модуля
if (typeof window !== "undefined" && "caches" in window) {
  caches
    .keys()
    .then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    })
    .catch(() => {
      // Игнорируем ошибки очистки кэша
    });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false, // Использовать кеш, если данные есть
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 минут — данные считаются свежими
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Вход без оболочки */}
              <Route path="/login" element={<LoginPage />} />

              {/* Защищённые маршруты внутри оболочки */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DynamicDashboard />} />
                <Route path="/upload" element={<FileUpload />} />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute requiredRole="super_admin">
                      <UserManagementPage />
                    </ProtectedRoute>
                  }
                />
                {/* DevTools доступен только супер-админу */}
                <Route
                  path="/dev-tools"
                  element={
                    <ProtectedRoute requiredRole="super_admin">
                      <DevTools />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
