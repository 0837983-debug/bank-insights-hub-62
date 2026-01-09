// Build trigger - force refresh
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ComponentsShowcase from "./pages/ComponentsShowcase";
import DevTools from "./pages/DevTools";
import DynamicDashboard from "./pages/DynamicDashboard";
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
      refetchOnMount: true, // Всегда обновлять при монтировании
      refetchOnWindowFocus: false,
      staleTime: 0, // Данные всегда считаются устаревшими
    },
  },
});

// Очищаем кэш React Query при инициализации
queryClient.clear();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DynamicDashboard />} />
            <Route path="/static" element={<Index />} />
            <Route path="/dashboard" element={<DynamicDashboard />} />
            <Route path="/components" element={<ComponentsShowcase />} />
            <Route path="/dev-tools" element={<DevTools />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
