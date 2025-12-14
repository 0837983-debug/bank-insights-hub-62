import {
  LandmarkIcon,
  TrendingUpIcon,
  PercentIcon,
  ActivityIcon,
  WalletIcon,
  UsersIcon,
  UserCheckIcon,
  UserMinusIcon,
  DollarSignIcon,
  PieChartIcon,
  TargetIcon,
  LayersIcon,
  RepeatIcon,
  ArrowRightLeft,
  TrendingDown,
  Globe,
  CreditCard,
  Users,
  RefreshCwIcon,
  BarChart3Icon,
} from "lucide-react";
import React from "react";

export interface DashboardKPI {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  description: string;
  change: number;
  ytdChange?: number;
  category: string;
  icon: React.ReactNode;
}

export const allDashboardKPIs: DashboardKPI[] = [
  // Financial Results
  {
    id: "capital",
    title: "Капитал",
    value: "₽8.2B",
    description: "Совокупный капитал банка, включающий уставный, добавочный и резервный капитал для покрытия рисков.",
    change: 5.2,
    ytdChange: 12.7,
    category: "Финансы",
    icon: <LandmarkIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "ebitda",
    title: "EBITDA",
    value: "₽2.1B",
    description: "Прибыль до вычета процентов, налогов, износа и амортизации, скорректированная на созданные резервы.",
    change: 12.3,
    ytdChange: 8.4,
    category: "Финансы",
    icon: <TrendingUpIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "cost-to-income",
    title: "Cost-to-Income",
    value: "42.5%",
    description: "Отношение операционных расходов к операционным доходам. Показывает эффективность управления расходами.",
    change: -3.1,
    ytdChange: -5.2,
    category: "Финансы",
    icon: <PercentIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "roa",
    title: "ROA",
    value: "2.8%",
    description: "Return on Assets — отношение чистой прибыли к средним активам. Показывает эффективность использования активов.",
    change: 0.4,
    ytdChange: 1.2,
    category: "Финансы",
    icon: <ActivityIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "roe",
    title: "ROE",
    value: "18.2%",
    description: "Return on Equity — отношение чистой прибыли к собственному капиталу. Показывает доходность для акционеров.",
    change: 2.1,
    ytdChange: -0.3,
    category: "Финансы",
    icon: <WalletIcon className="w-5 h-5 text-accent" />,
  },

  // Client Base
  {
    id: "mau",
    title: "MAU",
    value: "2.4M",
    description: "Число уникальных клиентов, совершивших ≥1 операцию за месяц",
    change: 8.5,
    ytdChange: 15.2,
    category: "Клиенты",
    icon: <UsersIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "dau",
    title: "DAU",
    value: "785K",
    description: "Число уникальных клиентов, совершивших ≥1 операцию за день",
    change: 6.2,
    ytdChange: 11.8,
    category: "Клиенты",
    icon: <UserCheckIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "arpu",
    title: "ARPU",
    value: "₽1,475",
    description: "Средний доход на одного клиента за период",
    change: 5.8,
    ytdChange: 9.4,
    category: "Клиенты",
    icon: <WalletIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "retention",
    title: "Retention",
    value: "78.5%",
    description: "Доля клиентов, совершивших ≥1 операцию и в текущем, и в предыдущем месяце",
    change: 2.1,
    ytdChange: 3.8,
    category: "Клиенты",
    icon: <TrendingUpIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "churn",
    title: "Churn",
    value: "4.2%",
    description: "Доля клиентов, активных в прошлом месяце, но не совершивших операций в текущем",
    change: -1.3,
    ytdChange: -2.1,
    category: "Клиенты",
    icon: <UserMinusIcon className="w-5 h-5 text-accent" />,
  },

  // Conversion
  {
    id: "fx-transactions",
    title: "FX-сделки",
    value: "705.5K",
    description: "Общее количество конверсионных операций за период",
    change: 9.4,
    ytdChange: 18.7,
    category: "Конвертация",
    icon: <RefreshCwIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "fx-avg-check",
    title: "Средний чек FX",
    value: "₽214.8K",
    description: "Средний объём одной конверсионной операции",
    change: 3.2,
    ytdChange: 5.6,
    category: "Конвертация",
    icon: <BarChart3Icon className="w-5 h-5 text-accent" />,
  },
  {
    id: "fx-spread",
    title: "FX-спред",
    value: "1.82%",
    description: "Средневзвешенный спред по всем FX-операциям",
    change: -0.08,
    ytdChange: -0.15,
    category: "Конвертация",
    icon: <PercentIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "fx-clients",
    title: "FX клиенты",
    value: "186.4K",
    description: "Количество уникальных клиентов, совершавших конверсии",
    change: 12.6,
    ytdChange: 22.4,
    category: "Конвертация",
    icon: <UsersIcon className="w-5 h-5 text-accent" />,
  },
  {
    id: "fx-per-client",
    title: "FX на клиента",
    value: "3.78",
    description: "Среднее количество FX-операций на одного клиента",
    change: -2.8,
    ytdChange: -1.5,
    category: "Конвертация",
    icon: <ActivityIcon className="w-5 h-5 text-accent" />,
  },
];

export const defaultSelectedKPIs = [
  "capital",
  "ebitda",
  "roe",
  "mau",
];

export const kpiCategories = [
  "Финансы",
  "Клиенты",
  "Конвертация",
];
