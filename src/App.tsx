// Build trigger - force refresh
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DevTools from "./pages/DevTools";
import DynamicDashboard from "./pages/DynamicDashboard";
import FileUpload from "./pages/FileUpload";
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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DynamicDashboard />} />
            <Route path="/dev-tools" element={<DevTools />} />
            <Route path="/upload" element={<FileUpload />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
