import { KPICard } from "@/components/KPICard";
import { FinancialTable } from "@/components/FinancialTable";
import { CollapsibleSection } from "@/components/report/CollapsibleSection";
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
    value: "₽45.2B",
    description: "Совокупные активы банка. Главная «размерная» метрика, от которой рассчитываются многие нормативы и относительные коэффициенты.",
    change: 5.2,
    ytdChange: 12.4,
    icon: <LandmarkIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "Депозиты клиентов",
    value: "₽22.5B",
    description: "Объём клиентского фондирования. Даёт понимание устойчивости и зависимости от клиентских ресурсов.",
    change: 7.3,
    ytdChange: 15.8,
    icon: <WalletIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "Капитал",
    value: "₽8.2B",
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

// Balance Data - Assets with 2 levels of hierarchy (no top-level "Активы")
const assetsData = [
  // Наличные и эквиваленты - Level 1
  { id: "a2", name: "Наличные и эквиваленты", value: 5800000000, percentage: 12.8, description: "Денежные средства в кассе и на счетах в ЦБ", isGroup: true, change: 3.1 },
  { id: "a2-1", name: "Касса", value: 1200000000, percentage: 20.7, description: "Наличные в кассах отделений", parentId: "a2", change: 1.5 },
  { id: "a2-2", name: "Счета в ЦБ", value: 3100000000, percentage: 53.4, description: "Обязательные резервы и остатки в ЦБ", parentId: "a2", change: 4.2 },
  { id: "a2-3", name: "Прочие эквиваленты", value: 1500000000, percentage: 25.9, description: "Краткосрочные высоколиквидные вложения", parentId: "a2", change: 2.8 },
  
  // Корреспондентские счета - Level 1
  { id: "a3", name: "Корреспондентские счета", value: 12400000000, percentage: 27.4, description: "Счета ностро в банках-корреспондентах", isGroup: true, change: 8.5 },
  { id: "a3-1", name: "Банки-резиденты", value: 7800000000, percentage: 62.9, description: "Счета в российских банках", parentId: "a3", change: 10.2 },
  { id: "a3-2", name: "Банки-нерезиденты", value: 4600000000, percentage: 37.1, description: "Счета в иностранных банках", parentId: "a3", change: 5.4 },
  
  // Инвестиции - Level 1
  { id: "a4", name: "Инвестиции", value: 8200000000, percentage: 18.1, description: "Ценные бумаги и депозиты в других банках", isGroup: true, change: -2.3 },
  { id: "a4-1", name: "ОФЗ", value: 4500000000, percentage: 54.9, description: "Облигации федерального займа", parentId: "a4", change: -1.2 },
  { id: "a4-2", name: "Корпоративные облигации", value: 2200000000, percentage: 26.8, description: "Облигации крупных корпораций", parentId: "a4", change: -4.5 },
  { id: "a4-3", name: "Акции", value: 1500000000, percentage: 18.3, description: "Долевые ценные бумаги", parentId: "a4", change: -3.1 },
  
  // Рабочие активы - Level 1
  { id: "a5", name: "Рабочие активы", value: 18800000000, percentage: 41.6, description: "Кредиты, дебиторская задолженность, операционные активы", isGroup: true, change: 6.7 },
  { id: "a5-1", name: "Кредиты юр. лицам", value: 9500000000, percentage: 50.5, description: "Корпоративное кредитование", parentId: "a5", change: 8.3 },
  { id: "a5-2", name: "Кредиты физ. лицам", value: 6200000000, percentage: 33.0, description: "Розничное кредитование", parentId: "a5", change: 5.1 },
  { id: "a5-3", name: "МБК размещённые", value: 2100000000, percentage: 11.2, description: "Межбанковские кредиты выданные", parentId: "a5", change: 4.8 },
  { id: "a5-4", name: "Прочие активы", value: 1000000000, percentage: 5.3, description: "ОС, НМА, дебиторская задолженность", parentId: "a5", change: 2.1 },
];

// Balance Data - Liabilities with 2 levels of hierarchy (no top-level "Пассивы")
const liabilitiesData = [
  // Депозиты клиентов - Level 1
  { id: "l2", name: "Депозиты клиентов", value: 22500000000, percentage: 49.8, description: "Срочные и до востребования депозиты физ. и юр. лиц", isGroup: true, change: 7.3 },
  { id: "l2-1", name: "Срочные депозиты физ. лиц", value: 11200000000, percentage: 49.8, description: "Вклады населения на срок", parentId: "l2", change: 9.1 },
  { id: "l2-2", name: "Срочные депозиты юр. лиц", value: 7800000000, percentage: 34.7, description: "Депозиты организаций на срок", parentId: "l2", change: 6.2 },
  { id: "l2-3", name: "Накопительные счета", value: 3500000000, percentage: 15.5, description: "Счета с начислением процентов", parentId: "l2", change: 4.8 },
  
  // Остатки ДВС - Level 1
  { id: "l3", name: "Остатки ДВС", value: 14200000000, percentage: 31.4, description: "Остатки на счетах до востребования", isGroup: true, change: 2.1 },
  { id: "l3-1", name: "Текущие счета физ. лиц", value: 5800000000, percentage: 40.8, description: "Карточные и расчётные счета населения", parentId: "l3", change: 3.5 },
  { id: "l3-2", name: "Расчётные счета юр. лиц", value: 6900000000, percentage: 48.6, description: "Операционные счета организаций", parentId: "l3", change: 1.2 },
  { id: "l3-3", name: "Эскроу и спецсчета", value: 1500000000, percentage: 10.6, description: "Целевые и специальные счета", parentId: "l3", change: 0.8 },
  
  // Привлечённые средства - Level 1
  { id: "l4", name: "Привлечённые средства", value: 8500000000, percentage: 18.8, description: "Межбанковские кредиты, облигации, прочие заимствования", isGroup: true, change: 4.5 },
  { id: "l4-1", name: "МБК привлечённые", value: 3200000000, percentage: 37.6, description: "Межбанковские кредиты полученные", parentId: "l4", change: 5.8 },
  { id: "l4-2", name: "Выпущенные облигации", value: 3800000000, percentage: 44.7, description: "Собственные долговые обязательства", parentId: "l4", change: 3.2 },
  { id: "l4-3", name: "Субординированные займы", value: 1500000000, percentage: 17.7, description: "Долгосрочные субордзаймы", parentId: "l4", change: 4.1 },
];

export const BalanceSection = () => {
  return (
    <CollapsibleSection title="Баланс">
      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
          title="Активы"
          rows={assetsData}
          showPercentage={true}
        />
        <FinancialTable
          title="Пассивы"
          rows={liabilitiesData}
          showPercentage={true}
        />
      </div>
    </CollapsibleSection>
  );
};
