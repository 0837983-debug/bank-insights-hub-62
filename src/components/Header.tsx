import { Building2Icon, BellIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Building2Icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Операционные метрики небанковского банка</h1>
                <p className="text-sm text-muted-foreground">Аналитика в режиме реального времени</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/">Дашборд</NavLink>
              <NavLink to="/config">Конфигурация</NavLink>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <BellIcon className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <SettingsIcon className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Настройки</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Настройки дашборда</DropdownMenuItem>
                <DropdownMenuItem>Экспорт в PDF</DropdownMenuItem>
                <DropdownMenuItem>Обновить данные</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
