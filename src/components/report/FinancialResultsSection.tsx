import { useState } from "react";
import { KPICard } from "@/components/KPICard";
import { FinancialTable } from "@/components/FinancialTable";
import { ReportFilters } from "@/components/ReportFilters";
import {
  LandmarkIcon,
  TrendingUpIcon,
  PercentIcon,
  ActivityIcon,
  WalletIcon,
} from "lucide-react";

// KPI Data
const kpiMetrics = [
  {
    title: "Капитал",
    value: "₽8.2 млрд",
    subtitle: "Регуляторный капитал",
    description: "Совокупный капитал банка, включающий уставный, добавочный и резервный капитал для покрытия рисков.",
    change: 5.2,
    icon: <LandmarkIcon className="w-6 h-6 text-accent" />,
  },
  {
    title: "EBITDA",
    value: "₽2.1 млрд",
    subtitle: "За вычетом резервов",
    description: "Прибыль до вычета процентов, налогов, износа и амортизации, скорректированная на созданные резервы.",
    change: 12.3,
    icon: <TrendingUpIcon className="w-6 h-6 text-accent" />,
  },
  {
    title: "Cost-to-Income",
    value: "42.5%",
    subtitle: "Операционная эффективность",
    description: "Отношение операционных расходов к операционным доходам. Показывает эффективность управления расходами.",
    change: -3.1,
    icon: <PercentIcon className="w-6 h-6 text-accent" />,
  },
  {
    title: "ROA",
    value: "2.8%",
    subtitle: "Рентабельность активов",
    description: "Return on Assets — отношение чистой прибыли к средним активам. Показывает эффективность использования активов.",
    change: 0.4,
    icon: <ActivityIcon className="w-6 h-6 text-accent" />,
  },
  {
    title: "ROE",
    value: "18.2%",
    subtitle: "Рентабельность капитала",
    description: "Return on Equity — отношение чистой прибыли к собственному капиталу. Показывает доходность для акционеров.",
    change: 2.1,
    icon: <WalletIcon className="w-6 h-6 text-accent" />,
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

// Income Data
const incomeData = [
  { id: "income", name: "Доходы", value: 12000000000, isGroup: true, change: 8.5 },
  { id: "i1", name: "Чистый процентный доход (ЧПД)", value: 3200000000, isGroup: true, description: "Разница между процентными доходами и расходами", parentId: "income", change: 5.2 },
  { id: "i2", name: "Процентные доходы", value: 4100000000, percentage: 100, indent: 1, parentId: "i1", change: 4.8 },
  { id: "i3", name: "Процентные расходы", value: -900000000, percentage: -22.0, indent: 1, parentId: "i1", change: 3.2 },
  { id: "i4", name: "Чистый комиссионный доход (ЧКД)", value: 5800000000, isGroup: true, description: "Доходы от комиссий за услуги банка", parentId: "income", change: 12.3 },
  { id: "i5", name: "Комиссии международных переводов", value: 3200000000, percentage: 55.2, indent: 1, parentId: "i4", change: 15.1 },
  { id: "i6", name: "Комиссии обслуживания", value: 1800000000, percentage: 31.0, indent: 1, parentId: "i4", change: 8.7 },
  { id: "i7", name: "Прочие комиссии", value: 800000000, percentage: 13.8, indent: 1, parentId: "i4", change: 6.2 },
  { id: "i8", name: "Доходы по FX", value: 2400000000, isGroup: true, description: "Доходы от валютно-обменных операций", parentId: "income", change: 9.8 },
  { id: "i9", name: "Спред конвертаций", value: 1400000000, percentage: 58.3, indent: 1, parentId: "i8", description: "Доход от разницы курсов покупки и продажи валюты", change: 11.2 },
  { id: "i10", name: "Маржа по FX-операциям", value: 800000000, percentage: 33.3, indent: 1, parentId: "i8", change: 7.5 },
  { id: "i11", name: "Доход трейдинга", value: 200000000, percentage: 8.3, indent: 1, parentId: "i8", change: 5.3 },
  { id: "i12", name: "Прочие доходы", value: 600000000, isGroup: true, parentId: "income", change: 3.1 },
  { id: "i13", name: "Операционные", value: 400000000, percentage: 66.7, indent: 1, parentId: "i12", change: 2.8 },
  { id: "i14", name: "Прочие финансовые", value: 200000000, percentage: 33.3, indent: 1, parentId: "i12", change: 3.7 },
];

// Expenses Data
const expensesData = [
  { id: "expenses", name: "Расходы и резервы", value: 5500000000, isGroup: true, change: 4.2 },
  { id: "e1", name: "ФОТ", value: 2800000000, isGroup: true, description: "Фонд оплаты труда: зарплаты и обязательные взносы", parentId: "expenses", change: 6.5 },
  { id: "e2", name: "Заработная плата", value: 2200000000, percentage: 78.6, indent: 1, parentId: "e1", change: 7.2 },
  { id: "e3", name: "Обязательные взносы", value: 600000000, percentage: 21.4, indent: 1, parentId: "e1", change: 4.1 },
  { id: "e4", name: "Прочие OPEX", value: 2300000000, isGroup: true, description: "Операционные и административные расходы", parentId: "expenses", change: 2.8 },
  { id: "e5", name: "Аренда", value: 450000000, percentage: 19.6, indent: 1, parentId: "e4", change: 1.5 },
  { id: "e6", name: "Процессинг", value: 680000000, percentage: 29.6, indent: 1, parentId: "e4", description: "Расходы на обработку транзакций", change: 5.3 },
  { id: "e7", name: "Эквайринг", value: 420000000, percentage: 18.3, indent: 1, parentId: "e4", change: 3.8 },
  { id: "e8", name: "Услуги поставщиков", value: 380000000, percentage: 16.5, indent: 1, parentId: "e4", change: 2.1 },
  { id: "e9", name: "Прочие OPEX", value: 370000000, percentage: 16.1, indent: 1, parentId: "e4", change: 1.2 },
  { id: "e10", name: "Резервы", value: 400000000, isGroup: true, description: "Изменение резервов на возможные потери", parentId: "expenses", change: -8.5 },
  { id: "e11", name: "Создание резервов", value: 650000000, indent: 1, parentId: "e10", change: -5.2 },
  { id: "e12", name: "Восстановление", value: -250000000, indent: 1, parentId: "e10", change: 12.3 },
  { id: "profit", name: "Финансовый результат", value: 6500000000, isTotal: true, change: 14.2 },
];
export const FinancialResultsSection = () => {
  const [period, setPeriod] = useState("quarter");
  const [comparison, setComparison] = useState("prev-period");

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">
        Финансовые результаты и баланс
      </h2>

      {/* Filters */}
      <ReportFilters
        period={period}
        comparison={comparison}
        onPeriodChange={setPeriod}
        onComparisonChange={setComparison}
      />

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiMetrics.map((metric) => (
          <KPICard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            description={metric.description}
            change={metric.change}
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

      {/* Income and Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinancialTable
          title="Структура доходов"
          rows={incomeData}
          showPercentage={true}
          showChange={true}
        />
        <FinancialTable
          title="Расходы и финансовый результат"
          rows={expensesData}
          showPercentage={true}
          showChange={true}
        />
      </div>
    </section>
  );
};
