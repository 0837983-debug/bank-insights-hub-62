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

const navLinkClassName =
  "px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors";
const navLinkActiveClassName = "text-foreground bg-muted font-semibold";

const navItems = [
  { to: "/", label: "Дашборд", testId: "nav-link-dashboard" },
  { to: "/upload", label: "Загрузка файлов", testId: "nav-link-upload" },
  { to: "/dev-tools", label: "Dev Tools", testId: "nav-link-dev-tools" },
] as const;

function NavSeparator() {
  return (
    <span className="text-muted-foreground/40 select-none px-0.5" aria-hidden="true">
      |
    </span>
  );
}

export const Header = () => {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-50" data-testid="app-header">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Building2Icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Операционные метрики небанковского банка
                </h1>
                <p className="text-sm text-muted-foreground">
                  Аналитика в режиме реального времени
                </p>
              </div>
            </div>

            <nav
              className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-border"
              data-testid="header-nav"
            >
              {navItems.map((item, index) => (
                <span key={item.to} className="flex items-center gap-1">
                  {index > 0 && <NavSeparator />}
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    className={navLinkClassName}
                    activeClassName={navLinkActiveClassName}
                    data-testid={item.testId}
                  >
                    {item.label}
                  </NavLink>
                </span>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" data-testid="btn-header-notifications">
              <BellIcon className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="btn-header-settings">
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
