import { useState, useCallback } from "react";
import { KPICard } from "@/components/KPICard";
import { FinancialTable, TableRowData, GroupingOption } from "@/components/FinancialTable";
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

// Default Income Data (by income type)
const defaultIncomeData: TableRowData[] = [
  { id: "i1", name: "Чистый процентный доход (ЧПД)", value: 3200000000, isGroup: true, description: "Разница между процентными доходами и расходами", change: 5.2 },
  { id: "i2", name: "Процентные доходы", value: 4100000000, isGroup: true, parentId: "i1", change: 4.8 },
  { id: "i2-1", name: "Доходы по кредитам ФЛ", value: 2100000000, percentage: 51.2, parentId: "i2", change: 5.1 },
  { id: "i2-2", name: "Доходы по кредитам ЮЛ", value: 1200000000, percentage: 29.3, parentId: "i2", change: 4.2 },
  { id: "i2-3", name: "Доходы от размещений", value: 800000000, percentage: 19.5, parentId: "i2", change: 5.8 },
  { id: "i3", name: "Процентные расходы", value: -900000000, isGroup: true, parentId: "i1", change: 3.2 },
  { id: "i3-1", name: "Расходы по депозитам ФЛ", value: -520000000, percentage: 57.8, parentId: "i3", change: 2.8 },
  { id: "i3-2", name: "Расходы по депозитам ЮЛ", value: -280000000, percentage: 31.1, parentId: "i3", change: 3.5 },
  { id: "i3-3", name: "Прочие процентные расходы", value: -100000000, percentage: 11.1, parentId: "i3", change: 4.1 },
  { id: "i4", name: "Чистый комиссионный доход (ЧКД)", value: 5800000000, isGroup: true, description: "Доходы от комиссий за услуги банка", change: 12.3 },
  { id: "i5", name: "Комиссии международных переводов", value: 3200000000, isGroup: true, parentId: "i4", change: 15.1 },
  { id: "i5-1", name: "Переводы в СНГ", value: 1600000000, percentage: 50.0, parentId: "i5", change: 18.2 },
  { id: "i5-2", name: "Переводы в Европу", value: 960000000, percentage: 30.0, parentId: "i5", change: 12.4 },
  { id: "i5-3", name: "Переводы в Азию", value: 640000000, percentage: 20.0, parentId: "i5", change: 11.8 },
  { id: "i6", name: "Комиссии обслуживания", value: 1800000000, isGroup: true, parentId: "i4", change: 8.7 },
  { id: "i6-1", name: "Обслуживание карт", value: 900000000, percentage: 50.0, parentId: "i6", change: 9.2 },
  { id: "i6-2", name: "Обслуживание счетов", value: 540000000, percentage: 30.0, parentId: "i6", change: 7.8 },
  { id: "i6-3", name: "Прочее обслуживание", value: 360000000, percentage: 20.0, parentId: "i6", change: 8.5 },
  { id: "i7", name: "Прочие комиссии", value: 800000000, percentage: 13.8, parentId: "i4", change: 6.2 },
  { id: "i8", name: "Доходы по FX", value: 2400000000, isGroup: true, description: "Доходы от валютно-обменных операций", change: 9.8 },
  { id: "i9", name: "Спред конвертаций", value: 1400000000, isGroup: true, parentId: "i8", description: "Доход от разницы курсов покупки и продажи валюты", change: 11.2 },
  { id: "i9-1", name: "USD/RUB", value: 700000000, percentage: 50.0, parentId: "i9", change: 12.5 },
  { id: "i9-2", name: "EUR/RUB", value: 420000000, percentage: 30.0, parentId: "i9", change: 10.2 },
  { id: "i9-3", name: "Прочие пары", value: 280000000, percentage: 20.0, parentId: "i9", change: 9.8 },
  { id: "i10", name: "Маржа по FX-операциям", value: 800000000, percentage: 33.3, parentId: "i8", change: 7.5 },
  { id: "i11", name: "Доход трейдинга", value: 200000000, percentage: 8.3, parentId: "i8", change: 5.3 },
  { id: "i12", name: "Прочие доходы", value: 600000000, isGroup: true, change: 3.1 },
  { id: "i13", name: "Операционные", value: 400000000, percentage: 66.7, parentId: "i12", change: 2.8 },
  { id: "i14", name: "Прочие финансовые", value: 200000000, percentage: 33.3, parentId: "i12", change: 3.7 },
];

// Group by client type data
const clientTypeIncomeData: TableRowData[] = [
  { id: "ct1", name: "ИП", value: 1850000000, isGroup: true, percentage: 15.4, change: 8.2 },
  { id: "ct1-1", name: "ЧПД", value: 520000000, percentage: 28.1, parentId: "ct1", change: 6.5 },
  { id: "ct1-2", name: "ЧКД", value: 780000000, percentage: 42.2, parentId: "ct1", change: 9.8 },
  { id: "ct1-3", name: "FX", value: 350000000, percentage: 18.9, parentId: "ct1", change: 7.2 },
  { id: "ct1-4", name: "Прочие", value: 200000000, percentage: 10.8, parentId: "ct1", change: 4.1 },
  
  { id: "ct2", name: "ФЛ-резидент", value: 4200000000, isGroup: true, percentage: 35.0, change: 12.5 },
  { id: "ct2-1", name: "ЧПД", value: 1260000000, percentage: 30.0, parentId: "ct2", change: 5.8 },
  { id: "ct2-2", name: "ЧКД", value: 1680000000, percentage: 40.0, parentId: "ct2", change: 15.2 },
  { id: "ct2-3", name: "FX", value: 840000000, percentage: 20.0, parentId: "ct2", change: 11.8 },
  { id: "ct2-4", name: "Прочие", value: 420000000, percentage: 10.0, parentId: "ct2", change: 8.3 },
  
  { id: "ct3", name: "ФЛ-нерезидент", value: 1450000000, isGroup: true, percentage: 12.1, change: 18.7 },
  { id: "ct3-1", name: "ЧПД", value: 290000000, percentage: 20.0, parentId: "ct3", change: 12.1 },
  { id: "ct3-2", name: "ЧКД", value: 580000000, percentage: 40.0, parentId: "ct3", change: 22.5 },
  { id: "ct3-3", name: "FX", value: 435000000, percentage: 30.0, parentId: "ct3", change: 19.8 },
  { id: "ct3-4", name: "Прочие", value: 145000000, percentage: 10.0, parentId: "ct3", change: 14.2 },
  
  { id: "ct4", name: "ЮЛ-резидент", value: 3500000000, isGroup: true, percentage: 29.2, change: 7.8 },
  { id: "ct4-1", name: "ЧПД", value: 1050000000, percentage: 30.0, parentId: "ct4", change: 4.5 },
  { id: "ct4-2", name: "ЧКД", value: 1400000000, percentage: 40.0, parentId: "ct4", change: 9.2 },
  { id: "ct4-3", name: "FX", value: 700000000, percentage: 20.0, parentId: "ct4", change: 8.1 },
  { id: "ct4-4", name: "Прочие", value: 350000000, percentage: 10.0, parentId: "ct4", change: 5.8 },
  
  { id: "ct5", name: "ЮЛ-нерезидент", value: 1000000000, isGroup: true, percentage: 8.3, change: 15.3 },
  { id: "ct5-1", name: "ЧПД", value: 200000000, percentage: 20.0, parentId: "ct5", change: 10.2 },
  { id: "ct5-2", name: "ЧКД", value: 400000000, percentage: 40.0, parentId: "ct5", change: 18.5 },
  { id: "ct5-3", name: "FX", value: 300000000, percentage: 30.0, parentId: "ct5", change: 16.8 },
  { id: "ct5-4", name: "Прочие", value: 100000000, percentage: 10.0, parentId: "ct5", change: 12.1 },
];

// Group by CFO data
const cfoIncomeData: TableRowData[] = [
  { id: "cfo1", name: "Розничный бизнес", value: 4800000000, isGroup: true, percentage: 40.0, change: 14.2 },
  { id: "cfo1-1", name: "ЧПД", value: 1920000000, percentage: 40.0, parentId: "cfo1", change: 6.8 },
  { id: "cfo1-2", name: "ЧКД", value: 1920000000, percentage: 40.0, parentId: "cfo1", change: 18.5 },
  { id: "cfo1-3", name: "FX", value: 720000000, percentage: 15.0, parentId: "cfo1", change: 12.3 },
  { id: "cfo1-4", name: "Прочие", value: 240000000, percentage: 5.0, parentId: "cfo1", change: 8.1 },
  
  { id: "cfo2", name: "Корпоративный бизнес", value: 3600000000, isGroup: true, percentage: 30.0, change: 8.5 },
  { id: "cfo2-1", name: "ЧПД", value: 1080000000, percentage: 30.0, parentId: "cfo2", change: 4.2 },
  { id: "cfo2-2", name: "ЧКД", value: 1440000000, percentage: 40.0, parentId: "cfo2", change: 10.8 },
  { id: "cfo2-3", name: "FX", value: 720000000, percentage: 20.0, parentId: "cfo2", change: 9.5 },
  { id: "cfo2-4", name: "Прочие", value: 360000000, percentage: 10.0, parentId: "cfo2", change: 6.2 },
  
  { id: "cfo3", name: "МСБ", value: 2400000000, isGroup: true, percentage: 20.0, change: 11.8 },
  { id: "cfo3-1", name: "ЧПД", value: 600000000, percentage: 25.0, parentId: "cfo3", change: 5.5 },
  { id: "cfo3-2", name: "ЧКД", value: 1080000000, percentage: 45.0, parentId: "cfo3", change: 15.2 },
  { id: "cfo3-3", name: "FX", value: 480000000, percentage: 20.0, parentId: "cfo3", change: 10.8 },
  { id: "cfo3-4", name: "Прочие", value: 240000000, percentage: 10.0, parentId: "cfo3", change: 7.3 },
  
  { id: "cfo4", name: "Private Banking", value: 720000000, isGroup: true, percentage: 6.0, change: 22.5 },
  { id: "cfo4-1", name: "ЧПД", value: 144000000, percentage: 20.0, parentId: "cfo4", change: 12.8 },
  { id: "cfo4-2", name: "ЧКД", value: 288000000, percentage: 40.0, parentId: "cfo4", change: 28.5 },
  { id: "cfo4-3", name: "FX", value: 216000000, percentage: 30.0, parentId: "cfo4", change: 25.2 },
  { id: "cfo4-4", name: "Прочие", value: 72000000, percentage: 10.0, parentId: "cfo4", change: 18.1 },
  
  { id: "cfo5", name: "Казначейство", value: 480000000, isGroup: true, percentage: 4.0, change: 5.2 },
  { id: "cfo5-1", name: "ЧПД", value: 240000000, percentage: 50.0, parentId: "cfo5", change: 3.8 },
  { id: "cfo5-2", name: "ЧКД", value: 48000000, percentage: 10.0, parentId: "cfo5", change: 4.5 },
  { id: "cfo5-3", name: "FX", value: 144000000, percentage: 30.0, parentId: "cfo5", change: 6.8 },
  { id: "cfo5-4", name: "Прочие", value: 48000000, percentage: 10.0, parentId: "cfo5", change: 5.1 },
];

// Group by segment data
const segmentIncomeData: TableRowData[] = [
  { id: "s1", name: "0–1 тыс", value: 120000000, isGroup: true, percentage: 1.0, change: 2.1 },
  { id: "s1-1", name: "ЧПД", value: 36000000, percentage: 30.0, parentId: "s1", change: 1.5 },
  { id: "s1-2", name: "ЧКД", value: 60000000, percentage: 50.0, parentId: "s1", change: 2.8 },
  { id: "s1-3", name: "FX", value: 12000000, percentage: 10.0, parentId: "s1", change: 1.8 },
  { id: "s1-4", name: "Прочие", value: 12000000, percentage: 10.0, parentId: "s1", change: 2.2 },
  
  { id: "s2", name: "1 тыс – 100 тыс", value: 600000000, isGroup: true, percentage: 5.0, change: 5.8 },
  { id: "s2-1", name: "ЧПД", value: 180000000, percentage: 30.0, parentId: "s2", change: 4.2 },
  { id: "s2-2", name: "ЧКД", value: 300000000, percentage: 50.0, parentId: "s2", change: 6.8 },
  { id: "s2-3", name: "FX", value: 60000000, percentage: 10.0, parentId: "s2", change: 5.1 },
  { id: "s2-4", name: "Прочие", value: 60000000, percentage: 10.0, parentId: "s2", change: 5.5 },
  
  { id: "s3", name: "100 тыс – 1 млн", value: 1440000000, isGroup: true, percentage: 12.0, change: 9.2 },
  { id: "s3-1", name: "ЧПД", value: 432000000, percentage: 30.0, parentId: "s3", change: 6.5 },
  { id: "s3-2", name: "ЧКД", value: 720000000, percentage: 50.0, parentId: "s3", change: 11.2 },
  { id: "s3-3", name: "FX", value: 144000000, percentage: 10.0, parentId: "s3", change: 8.5 },
  { id: "s3-4", name: "Прочие", value: 144000000, percentage: 10.0, parentId: "s3", change: 7.8 },
  
  { id: "s4", name: "1–5 млн", value: 2160000000, isGroup: true, percentage: 18.0, change: 12.5 },
  { id: "s4-1", name: "ЧПД", value: 648000000, percentage: 30.0, parentId: "s4", change: 8.2 },
  { id: "s4-2", name: "ЧКД", value: 1080000000, percentage: 50.0, parentId: "s4", change: 15.8 },
  { id: "s4-3", name: "FX", value: 216000000, percentage: 10.0, parentId: "s4", change: 10.5 },
  { id: "s4-4", name: "Прочие", value: 216000000, percentage: 10.0, parentId: "s4", change: 11.2 },
  
  { id: "s5", name: "5–10 млн", value: 1800000000, isGroup: true, percentage: 15.0, change: 14.8 },
  { id: "s5-1", name: "ЧПД", value: 540000000, percentage: 30.0, parentId: "s5", change: 10.2 },
  { id: "s5-2", name: "ЧКД", value: 900000000, percentage: 50.0, parentId: "s5", change: 18.5 },
  { id: "s5-3", name: "FX", value: 180000000, percentage: 10.0, parentId: "s5", change: 12.8 },
  { id: "s5-4", name: "Прочие", value: 180000000, percentage: 10.0, parentId: "s5", change: 13.5 },
  
  { id: "s6", name: "10–50 млн", value: 2400000000, isGroup: true, percentage: 20.0, change: 11.2 },
  { id: "s6-1", name: "ЧПД", value: 720000000, percentage: 30.0, parentId: "s6", change: 7.5 },
  { id: "s6-2", name: "ЧКД", value: 1200000000, percentage: 50.0, parentId: "s6", change: 14.2 },
  { id: "s6-3", name: "FX", value: 240000000, percentage: 10.0, parentId: "s6", change: 9.8 },
  { id: "s6-4", name: "Прочие", value: 240000000, percentage: 10.0, parentId: "s6", change: 10.5 },
  
  { id: "s7", name: "50–100 млн", value: 1680000000, isGroup: true, percentage: 14.0, change: 8.5 },
  { id: "s7-1", name: "ЧПД", value: 504000000, percentage: 30.0, parentId: "s7", change: 5.8 },
  { id: "s7-2", name: "ЧКД", value: 840000000, percentage: 50.0, parentId: "s7", change: 10.2 },
  { id: "s7-3", name: "FX", value: 168000000, percentage: 10.0, parentId: "s7", change: 7.5 },
  { id: "s7-4", name: "Прочие", value: 168000000, percentage: 10.0, parentId: "s7", change: 8.2 },
  
  { id: "s8", name: "100 млн – 1 млрд", value: 1200000000, isGroup: true, percentage: 10.0, change: 6.8 },
  { id: "s8-1", name: "ЧПД", value: 360000000, percentage: 30.0, parentId: "s8", change: 4.2 },
  { id: "s8-2", name: "ЧКД", value: 600000000, percentage: 50.0, parentId: "s8", change: 8.5 },
  { id: "s8-3", name: "FX", value: 120000000, percentage: 10.0, parentId: "s8", change: 5.8 },
  { id: "s8-4", name: "Прочие", value: 120000000, percentage: 10.0, parentId: "s8", change: 6.2 },
  
  { id: "s9", name: "> 1 млрд", value: 600000000, isGroup: true, percentage: 5.0, change: 18.5 },
  { id: "s9-1", name: "ЧПД", value: 180000000, percentage: 30.0, parentId: "s9", change: 12.8 },
  { id: "s9-2", name: "ЧКД", value: 300000000, percentage: 50.0, parentId: "s9", change: 22.5 },
  { id: "s9-3", name: "FX", value: 60000000, percentage: 10.0, parentId: "s9", change: 15.8 },
  { id: "s9-4", name: "Прочие", value: 60000000, percentage: 10.0, parentId: "s9", change: 18.2 },
];

// Expenses Data with 3 levels (top level moved to table title)
const expensesData: TableRowData[] = [
  { id: "e1", name: "ФОТ", value: 2800000000, isGroup: true, description: "Фонд оплаты труда: зарплаты и обязательные взносы", change: 6.5 },
  { id: "e2", name: "Заработная плата", value: 2200000000, isGroup: true, parentId: "e1", change: 7.2 },
  { id: "e2-1", name: "Основной персонал", value: 1540000000, percentage: 70.0, parentId: "e2", change: 7.5 },
  { id: "e2-2", name: "Менеджмент", value: 440000000, percentage: 20.0, parentId: "e2", change: 6.8 },
  { id: "e2-3", name: "Бэк-офис", value: 220000000, percentage: 10.0, parentId: "e2", change: 6.2 },
  { id: "e3", name: "Обязательные взносы", value: 600000000, isGroup: true, parentId: "e1", change: 4.1 },
  { id: "e3-1", name: "ПФР", value: 360000000, percentage: 60.0, parentId: "e3", change: 4.0 },
  { id: "e3-2", name: "ФСС", value: 150000000, percentage: 25.0, parentId: "e3", change: 4.2 },
  { id: "e3-3", name: "ФОМС", value: 90000000, percentage: 15.0, parentId: "e3", change: 4.3 },
  { id: "e4", name: "Прочие OPEX", value: 2300000000, isGroup: true, description: "Операционные и административные расходы", change: 2.8 },
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
  { id: "e10", name: "Резервы", value: 400000000, isGroup: true, description: "Изменение резервов на возможные потери", change: -8.5 },
  { id: "e11", name: "Создание резервов", value: 650000000, isGroup: true, parentId: "e10", change: -5.2 },
  { id: "e11-1", name: "Резервы по кредитам", value: 455000000, percentage: 70.0, parentId: "e11", change: -4.8 },
  { id: "e11-2", name: "Резервы по гарантиям", value: 130000000, percentage: 20.0, parentId: "e11", change: -6.2 },
  { id: "e11-3", name: "Прочие резервы", value: 65000000, percentage: 10.0, parentId: "e11", change: -5.5 },
  { id: "e12", name: "Восстановление", value: -250000000, parentId: "e10", change: 12.3 },
  { id: "profit", name: "Финансовый результат", value: 6500000000, isTotal: true, change: 14.2 },
];

// Grouping options for income table
const incomeGroupingOptions: GroupingOption[] = [
  { id: "client_type", label: "Тип клиента" },
  { id: "cfo", label: "ЦФО" },
  { id: "segment", label: "Сегмент" },
];

// Grouping options for expenses table
const expensesGroupingOptions: GroupingOption[] = [
  { id: "fot", label: "ФОТ" },
];

// FOT grouped by departments with top 5 recipients
const fotExpensesData: TableRowData[] = [
  { id: "dept1", name: "IT департамент", value: 680000000, isGroup: true, percentage: 24.3, change: 8.5 },
  { id: "dept1-1", name: "Иванов А.С.", value: 24000000, percentage: 3.5, parentId: "dept1", change: 5.2 },
  { id: "dept1-2", name: "Петров М.В.", value: 21500000, percentage: 3.2, parentId: "dept1", change: 4.8 },
  { id: "dept1-3", name: "Сидоров К.Л.", value: 19800000, percentage: 2.9, parentId: "dept1", change: 6.1 },
  { id: "dept1-4", name: "Козлова Е.Н.", value: 18200000, percentage: 2.7, parentId: "dept1", change: 7.3 },
  { id: "dept1-5", name: "Морозов Д.А.", value: 17500000, percentage: 2.6, parentId: "dept1", change: 5.8 },
  { id: "dept1-6", name: "Прочие", value: 579000000, percentage: 85.1, parentId: "dept1", change: 8.9 },
  
  { id: "dept2", name: "Розничный бизнес", value: 620000000, isGroup: true, percentage: 22.1, change: 7.2 },
  { id: "dept2-1", name: "Волков П.И.", value: 22000000, percentage: 3.5, parentId: "dept2", change: 6.5 },
  { id: "dept2-2", name: "Новикова О.С.", value: 20500000, percentage: 3.3, parentId: "dept2", change: 5.9 },
  { id: "dept2-3", name: "Федоров А.М.", value: 19200000, percentage: 3.1, parentId: "dept2", change: 7.1 },
  { id: "dept2-4", name: "Соколов В.Д.", value: 17800000, percentage: 2.9, parentId: "dept2", change: 6.8 },
  { id: "dept2-5", name: "Попова Н.К.", value: 16500000, percentage: 2.7, parentId: "dept2", change: 5.5 },
  { id: "dept2-6", name: "Прочие", value: 524000000, percentage: 84.5, parentId: "dept2", change: 7.4 },
  
  { id: "dept3", name: "Корпоративный бизнес", value: 540000000, isGroup: true, percentage: 19.3, change: 5.8 },
  { id: "dept3-1", name: "Лебедев С.А.", value: 28000000, percentage: 5.2, parentId: "dept3", change: 4.2 },
  { id: "dept3-2", name: "Кузнецов И.П.", value: 25500000, percentage: 4.7, parentId: "dept3", change: 5.1 },
  { id: "dept3-3", name: "Михайлова Т.В.", value: 23000000, percentage: 4.3, parentId: "dept3", change: 6.3 },
  { id: "dept3-4", name: "Егоров Р.Н.", value: 21000000, percentage: 3.9, parentId: "dept3", change: 5.7 },
  { id: "dept3-5", name: "Павлова Ю.А.", value: 19500000, percentage: 3.6, parentId: "dept3", change: 4.9 },
  { id: "dept3-6", name: "Прочие", value: 423000000, percentage: 78.3, parentId: "dept3", change: 6.1 },
  
  { id: "dept4", name: "Риски и комплаенс", value: 380000000, isGroup: true, percentage: 13.6, change: 4.5 },
  { id: "dept4-1", name: "Смирнов В.Г.", value: 18500000, percentage: 4.9, parentId: "dept4", change: 3.8 },
  { id: "dept4-2", name: "Орлова М.С.", value: 16800000, percentage: 4.4, parentId: "dept4", change: 4.2 },
  { id: "dept4-3", name: "Титов А.Л.", value: 15200000, percentage: 4.0, parentId: "dept4", change: 5.1 },
  { id: "dept4-4", name: "Белова Е.О.", value: 14000000, percentage: 3.7, parentId: "dept4", change: 4.6 },
  { id: "dept4-5", name: "Крылов Н.Д.", value: 13000000, percentage: 3.4, parentId: "dept4", change: 3.9 },
  { id: "dept4-6", name: "Прочие", value: 302500000, percentage: 79.6, parentId: "dept4", change: 4.7 },
  
  { id: "dept5", name: "Финансы и бухгалтерия", value: 320000000, isGroup: true, percentage: 11.4, change: 3.2 },
  { id: "dept5-1", name: "Захаров П.В.", value: 17000000, percentage: 5.3, parentId: "dept5", change: 2.8 },
  { id: "dept5-2", name: "Романова А.И.", value: 15500000, percentage: 4.8, parentId: "dept5", change: 3.1 },
  { id: "dept5-3", name: "Васильев О.М.", value: 14200000, percentage: 4.4, parentId: "dept5", change: 3.5 },
  { id: "dept5-4", name: "Николаева С.Д.", value: 13000000, percentage: 4.1, parentId: "dept5", change: 2.9 },
  { id: "dept5-5", name: "Алексеев К.Р.", value: 12000000, percentage: 3.8, parentId: "dept5", change: 3.3 },
  { id: "dept5-6", name: "Прочие", value: 248300000, percentage: 77.6, parentId: "dept5", change: 3.4 },
  
  { id: "dept6", name: "Прочие департаменты", value: 260000000, isGroup: true, percentage: 9.3, change: 6.1 },
  { id: "dept6-1", name: "Макаров Д.С.", value: 14000000, percentage: 5.4, parentId: "dept6", change: 5.2 },
  { id: "dept6-2", name: "Андреева Л.П.", value: 12500000, percentage: 4.8, parentId: "dept6", change: 6.5 },
  { id: "dept6-3", name: "Сергеев В.Н.", value: 11200000, percentage: 4.3, parentId: "dept6", change: 5.8 },
  { id: "dept6-4", name: "Борисова К.А.", value: 10000000, percentage: 3.8, parentId: "dept6", change: 6.2 },
  { id: "dept6-5", name: "Яковлев М.Е.", value: 9300000, percentage: 3.6, parentId: "dept6", change: 5.5 },
  { id: "dept6-6", name: "Прочие", value: 203000000, percentage: 78.1, parentId: "dept6", change: 6.3 },
];

export const FinancialResultsSection = () => {
  const [incomeData, setIncomeData] = useState<TableRowData[]>(defaultIncomeData);
  const [isLoadingIncome, setIsLoadingIncome] = useState(false);
  const [expensesDataState, setExpensesDataState] = useState<TableRowData[]>(expensesData);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);

  const handleIncomeGroupingChange = useCallback((groupBy: string | null) => {
    setIsLoadingIncome(true);
    
    // Simulate API call delay
    setTimeout(() => {
      switch (groupBy) {
        case "client_type":
          setIncomeData(clientTypeIncomeData);
          break;
        case "cfo":
          setIncomeData(cfoIncomeData);
          break;
        case "segment":
          setIncomeData(segmentIncomeData);
          break;
        default:
          setIncomeData(defaultIncomeData);
      }
      setIsLoadingIncome(false);
    }, 300);
  }, []);

  const handleExpensesGroupingChange = useCallback((groupBy: string | null) => {
    setIsLoadingExpenses(true);
    
    // Simulate API call delay
    setTimeout(() => {
      switch (groupBy) {
        case "fot":
          setExpensesDataState(fotExpensesData);
          break;
        default:
          setExpensesDataState(expensesData);
      }
      setIsLoadingExpenses(false);
    }, 300);
  }, []);

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
          title="Доходы"
          rows={incomeData}
          showPercentage={true}
          showChange={true}
          groupingOptions={incomeGroupingOptions}
          onGroupingChange={handleIncomeGroupingChange}
          isLoading={isLoadingIncome}
        />
        <FinancialTable
          title="Расходы и резервы"
          rows={expensesDataState}
          showPercentage={true}
          showChange={true}
          groupingOptions={expensesGroupingOptions}
          onGroupingChange={handleExpensesGroupingChange}
          isLoading={isLoadingExpenses}
        />
      </div>
    </section>
  );
};
