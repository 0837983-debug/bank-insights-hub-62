import { TableRowData } from "./tableDataService.js";

// Default income data (by income type)
const defaultIncomeData: Omit<TableRowData, "sortOrder">[] = [
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

// Group by client type
const clientTypeData: Omit<TableRowData, "sortOrder">[] = [
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

// Group by CFO (cost centers)
const cfoData: Omit<TableRowData, "sortOrder">[] = [
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

// Group by segment (by client balance)
const segmentData: Omit<TableRowData, "sortOrder">[] = [
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

export function getIncomeDataByGrouping(groupBy: string | null): Omit<TableRowData, "sortOrder">[] {
  switch (groupBy) {
    case "client_type":
      return clientTypeData;
    case "cfo":
      return cfoData;
    case "segment":
      return segmentData;
    default:
      return defaultIncomeData;
  }
}

export const incomeGroupingOptions = [
  { id: "client_type", label: "Тип клиента" },
  { id: "cfo", label: "ЦФО" },
  { id: "segment", label: "Сегмент" },
];
