import { KPICard } from "@/components/KPICard";
import { FinancialTable } from "@/components/FinancialTable";
import {
  TrendingUpIcon,
  PercentIcon,
  ActivityIcon,
  WalletIcon,
  BanknoteIcon,
} from "lucide-react";

// KPI Data - Финансовые результаты
const kpiMetrics = [
  {
    title: "Чистая прибыль",
    value: "₽6.5B",
    description: "Финансовый результат после всех расходов, резервов и налогов. Базовый индикатор прибыльности банка.",
    change: 14.2,
    ytdChange: 18.5,
    icon: <BanknoteIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "EBITDA",
    value: "₽2.1B",
    description: "Операционная прибыль до вычета процентов, налогов, износа и амортизации. Показывает операционную эффективность без влияния резервов.",
    change: 12.3,
    ytdChange: 8.4,
    icon: <TrendingUpIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "Cost-to-Income",
    value: "42.5%",
    description: "Отношение операционных расходов к операционным доходам. Главный показатель эффективности затрат для сравнения по времени и с конкурентами.",
    change: -3.1,
    ytdChange: -5.2,
    icon: <PercentIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "ROA",
    value: "2.8%",
    description: "Return on Assets — отношение чистой прибыли к средним активам. Показывает, насколько эффективно банк использует активы.",
    change: 0.4,
    ytdChange: 1.2,
    icon: <ActivityIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "ROE",
    value: "18.2%",
    description: "Return on Equity — отношение чистой прибыли к собственному капиталу. Показывает, сколько зарабатывает капитал собственников.",
    change: 2.1,
    ytdChange: -0.3,
    icon: <WalletIcon className="w-5 h-5 text-accent" />,
  },
];

// Income Data with 3 levels
const incomeData = [
  { id: "income", name: "Доходы", value: 12000000000, isGroup: true, change: 8.5 },
  { id: "i1", name: "Чистый процентный доход (ЧПД)", value: 3200000000, isGroup: true, description: "Разница между процентными доходами и расходами", parentId: "income", change: 5.2 },
  { id: "i2", name: "Процентные доходы", value: 4100000000, isGroup: true, parentId: "i1", change: 4.8 },
  { id: "i2-1", name: "Доходы по кредитам ФЛ", value: 2100000000, percentage: 51.2, parentId: "i2", change: 5.1 },
  { id: "i2-2", name: "Доходы по кредитам ЮЛ", value: 1200000000, percentage: 29.3, parentId: "i2", change: 4.2 },
  { id: "i2-3", name: "Доходы от размещений", value: 800000000, percentage: 19.5, parentId: "i2", change: 5.8 },
  { id: "i3", name: "Процентные расходы", value: -900000000, isGroup: true, parentId: "i1", change: 3.2 },
  { id: "i3-1", name: "Расходы по депозитам ФЛ", value: -520000000, percentage: 57.8, parentId: "i3", change: 2.8 },
  { id: "i3-2", name: "Расходы по депозитам ЮЛ", value: -280000000, percentage: 31.1, parentId: "i3", change: 3.5 },
  { id: "i3-3", name: "Прочие процентные расходы", value: -100000000, percentage: 11.1, parentId: "i3", change: 4.1 },
  { id: "i4", name: "Чистый комиссионный доход (ЧКД)", value: 5800000000, isGroup: true, description: "Доходы от комиссий за услуги банка", parentId: "income", change: 12.3 },
  { id: "i5", name: "Комиссии международных переводов", value: 3200000000, isGroup: true, parentId: "i4", change: 15.1 },
  { id: "i5-1", name: "Переводы в СНГ", value: 1600000000, percentage: 50.0, parentId: "i5", change: 18.2 },
  { id: "i5-2", name: "Переводы в Европу", value: 960000000, percentage: 30.0, parentId: "i5", change: 12.4 },
  { id: "i5-3", name: "Переводы в Азию", value: 640000000, percentage: 20.0, parentId: "i5", change: 11.8 },
  { id: "i6", name: "Комиссии обслуживания", value: 1800000000, isGroup: true, parentId: "i4", change: 8.7 },
  { id: "i6-1", name: "Обслуживание карт", value: 900000000, percentage: 50.0, parentId: "i6", change: 9.2 },
  { id: "i6-2", name: "Обслуживание счетов", value: 540000000, percentage: 30.0, parentId: "i6", change: 7.8 },
  { id: "i6-3", name: "Прочее обслуживание", value: 360000000, percentage: 20.0, parentId: "i6", change: 8.5 },
  { id: "i7", name: "Прочие комиссии", value: 800000000, percentage: 13.8, parentId: "i4", change: 6.2 },
  { id: "i8", name: "Доходы по FX", value: 2400000000, isGroup: true, description: "Доходы от валютно-обменных операций", parentId: "income", change: 9.8 },
  { id: "i9", name: "Спред конвертаций", value: 1400000000, isGroup: true, parentId: "i8", description: "Доход от разницы курсов покупки и продажи валюты", change: 11.2 },
  { id: "i9-1", name: "USD/RUB", value: 700000000, percentage: 50.0, parentId: "i9", change: 12.5 },
  { id: "i9-2", name: "EUR/RUB", value: 420000000, percentage: 30.0, parentId: "i9", change: 10.2 },
  { id: "i9-3", name: "Прочие пары", value: 280000000, percentage: 20.0, parentId: "i9", change: 9.8 },
  { id: "i10", name: "Маржа по FX-операциям", value: 800000000, percentage: 33.3, parentId: "i8", change: 7.5 },
  { id: "i11", name: "Доход трейдинга", value: 200000000, percentage: 8.3, parentId: "i8", change: 5.3 },
  { id: "i12", name: "Прочие доходы", value: 600000000, isGroup: true, parentId: "income", change: 3.1 },
  { id: "i13", name: "Операционные", value: 400000000, percentage: 66.7, parentId: "i12", change: 2.8 },
  { id: "i14", name: "Прочие финансовые", value: 200000000, percentage: 33.3, parentId: "i12", change: 3.7 },
];

// Expenses Data with 3 levels
const expensesData = [
  { id: "expenses", name: "Расходы и резервы", value: 5500000000, isGroup: true, change: 4.2 },
  { id: "e1", name: "ФОТ", value: 2800000000, isGroup: true, description: "Фонд оплаты труда: зарплаты и обязательные взносы", parentId: "expenses", change: 6.5 },
  { id: "e2", name: "Заработная плата", value: 2200000000, isGroup: true, parentId: "e1", change: 7.2 },
  { id: "e2-1", name: "Основной персонал", value: 1540000000, percentage: 70.0, parentId: "e2", change: 7.5 },
  { id: "e2-2", name: "Менеджмент", value: 440000000, percentage: 20.0, parentId: "e2", change: 6.8 },
  { id: "e2-3", name: "Бэк-офис", value: 220000000, percentage: 10.0, parentId: "e2", change: 6.2 },
  { id: "e3", name: "Обязательные взносы", value: 600000000, isGroup: true, parentId: "e1", change: 4.1 },
  { id: "e3-1", name: "ПФР", value: 360000000, percentage: 60.0, parentId: "e3", change: 4.0 },
  { id: "e3-2", name: "ФСС", value: 150000000, percentage: 25.0, parentId: "e3", change: 4.2 },
  { id: "e3-3", name: "ФОМС", value: 90000000, percentage: 15.0, parentId: "e3", change: 4.3 },
  { id: "e4", name: "Прочие OPEX", value: 2300000000, isGroup: true, description: "Операционные и административные расходы", parentId: "expenses", change: 2.8 },
  { id: "e5", name: "Аренда", value: 450000000, isGroup: true, parentId: "e4", change: 1.5 },
  { id: "e5-1", name: "Офисы", value: 315000000, percentage: 70.0, parentId: "e5", change: 1.2 },
  { id: "e5-2", name: "Дата-центры", value: 90000000, percentage: 20.0, parentId: "e5", change: 2.5 },
  { id: "e5-3", name: "Прочая аренда", value: 45000000, percentage: 10.0, parentId: "e5", change: 1.8 },
  { id: "e6", name: "Процессинг", value: 680000000, isGroup: true, parentId: "e4", description: "Расходы на обработку транзакций", change: 5.3 },
  { id: "e6-1", name: "Карточный процессинг", value: 408000000, percentage: 60.0, parentId: "e6", change: 5.8 },
  { id: "e6-2", name: "Переводы", value: 204000000, percentage: 30.0, parentId: "e6", change: 4.5 },
  { id: "e6-3", name: "Прочий процессинг", value: 68000000, percentage: 10.0, parentId: "e6", change: 4.8 },
  { id: "e7", name: "Эквайринг", value: 420000000, percentage: 18.3, parentId: "e4", change: 3.8 },
  { id: "e8", name: "Услуги поставщиков", value: 380000000, percentage: 16.5, parentId: "e4", change: 2.1 },
  { id: "e9", name: "Прочие OPEX", value: 370000000, percentage: 16.1, parentId: "e4", change: 1.2 },
  { id: "e10", name: "Резервы", value: 400000000, isGroup: true, description: "Изменение резервов на возможные потери", parentId: "expenses", change: -8.5 },
  { id: "e11", name: "Создание резервов", value: 650000000, isGroup: true, parentId: "e10", change: -5.2 },
  { id: "e11-1", name: "Резервы по кредитам", value: 455000000, percentage: 70.0, parentId: "e11", change: -4.8 },
  { id: "e11-2", name: "Резервы по гарантиям", value: 130000000, percentage: 20.0, parentId: "e11", change: -6.2 },
  { id: "e11-3", name: "Прочие резервы", value: 65000000, percentage: 10.0, parentId: "e11", change: -5.5 },
  { id: "e12", name: "Восстановление", value: -250000000, parentId: "e10", change: 12.3 },
  { id: "profit", name: "Финансовый результат", value: 6500000000, isTotal: true, change: 14.2 },
];

export const FinancialResultsSection = () => {
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">
        Финансовые результаты
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
