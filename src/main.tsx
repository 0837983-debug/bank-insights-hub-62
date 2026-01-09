import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Логирование для диагностики
console.log("🚀 main.tsx: Начало загрузки приложения");
console.log("📍 URL:", window.location.href);
console.log("🌐 User Agent:", navigator.userAgent);

// Обработка ошибок при рендеринге
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element not found. Make sure <div id="root"></div> exists in index.html');
}

// Обработка глобальных ошибок
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

try {
  console.log("✅ Root element найден, создаю React root...");
  const root = createRoot(rootElement);
  console.log("✅ React root создан, начинаю рендеринг...");
  root.render(<App />);
  console.log("✅ Приложение успешно смонтировано");
} catch (error) {
  console.error("❌ Ошибка при рендеринге:", error);
  console.error("Failed to render app:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: system-ui; color: red;">
      <h1>Ошибка загрузки приложения</h1>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
      <p>Проверьте консоль браузера для подробностей.</p>
    </div>
  `;
}
