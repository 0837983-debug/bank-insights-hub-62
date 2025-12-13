import { KPICard } from "@/components/KPICard";
import { FinancialTable } from "@/components/FinancialTable";
import {
  LandmarkIcon,
  WalletIcon,
  ShieldIcon,
  DropletIcon,
  BriefcaseIcon,
} from "lucide-react";

// KPI Data - Баланс
const kpiMetrics = [
  {
    title: "Объём активов",
    value: "₽45.2 млрд",
    description: "Совокупные активы банка. Главная «размерная» метрика, от которой рассчитываются многие нормативы и относительные коэффициенты.",
    change: 5.2,
    ytdChange: 12.4,
    icon: <LandmarkIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "Депозиты клиентов",
    value: "₽22.5 млрд",
    description: "Объём клиентского фондирования. Даёт понимание устойчивости и зависимости от клиентских ресурсов.",
    change: 7.3,
    ytdChange: 15.8,
    icon: <WalletIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "Капитал",
    value: "₽8.2 млрд",
    description: "Собственные средства банка. Ключевой показатель устойчивости, на который опирается ROE и нормативы достаточности.",
    change: 5.2,
    ytdChange: 12.7,
    icon: <ShieldIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "Доля HLA",
    value: "40.2%",
    description: "Доля высоколиквидных активов (High Liquid Assets). Отражает способность банка исполнять обязательства, показатель ликвидности.",
    change: 2.1,
    ytdChange: 3.5,
    icon: <DropletIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "Рабочие активы",
    value: "59.7%",
    description: "Доля рабочих активов (кредитный портфель + инвестиции) в общих активах. Показывает эффективность размещения ресурсов.",
    change: 1.8,
    ytdChange: 4.2,
    icon: <BriefcaseIcon className="w-5 h-5 text-accent" />,
  },
];

// Balance Data - Assets
const assetsData = [
  { id: "a1", name: "Активы", value: 45200000000, isGroup: true, change: 5.2 },
  { id: "a2", name: "Наличные и эквиваленты", value: 5800000000, percentage: 12.8, description: "Денежные средства в кассе и на счетах в ЦБ", indent: 1, parentId: "a1", change: 3.1 },
  { id: "a3", name: "Корреспондентские счета", value: 12400000000, percentage: 27.4, description: "Счета ностро в банках-корреспондентах", indent: 1, parentId: "a1", change: 8.5 },
  { id: "a4", name: "Инвестиции", value: 8200000000, percentage: 18.1, description: "Ценные бумаги и депозиты в других банках", indent: 1, parentId: "a1", change: -2.3 },
  { id: "a5", name: "Рабочие активы", value: 18800000000, percentage: 41.6, description: "Кредиты, дебиторская задолженность, операционные активы", indent: 1, parentId: "a1", change: 6.7 },
];

// Balance Data - Liabilities
const liabilitiesData = [
  { id: "l1", name: "Пассивы", value: 45200000000, isGroup: true, change: 5.2 },
  { id: "l2", name: "Депозиты клиентов", value: 22500000000, percentage: 49.8, description: "Срочные и до востребования депозиты физ. и юр. лиц", indent: 1, parentId: "l1", change: 7.3 },
  { id: "l3", name: "Остатки ДВС", value: 14200000000, percentage: 31.4, description: "Остатки на счетах до востребования", indent: 1, parentId: "l1", change: 2.1 },
  { id: "l4", name: "Привлечённые средства", value: 8500000000, percentage: 18.8, description: "Межбанковские кредиты, облигации, прочие заимствования", indent: 1, parentId: "l1", change: 4.5 },
];

export const BalanceSection = () => {
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">
        Баланс
      </h2>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiMetrics.map((metric) => (
          <KPICard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            description={metric.description}
            change={metric.change}
            ytdChange={metric.ytdChange}
            showChange={true}
            icon={metric.icon}
          />
        ))}
      </div>

      {/* Balance Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinancialTable
          title="Структура активов"
          rows={assetsData}
          showPercentage={true}
        />
        <FinancialTable
          title="Структура пассивов"
          rows={liabilitiesData}
          showPercentage={true}
        />
      </div>
    </section>
  );
};
