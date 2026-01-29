/**
 * Common types and interfaces for MART services
 */

export interface KPIMetric {
  id: string;
  periodDate: string; // актуальная дата периода (YYYY-MM-DD)
  value: number;
  previousValue: number; // значение предыдущего периода
  ytdValue?: number; // значение за аналогичный период прошлого года
  // Расчёт процентов теперь происходит на фронтенде
  // Поля ppChange, ppChangeAbsolute, ytdChange, ytdChangeAbsolute удалены
}

export interface TableRowData {
  // Поля из mart.balance (основные)
  class?: string;
  section?: string;
  item?: string;
  sub_item?: string;
  value: number;
  // Расчетные поля
  percentage?: number;
  previousValue?: number; // значение предыдущего периода
  ytdValue?: number; // значение за аналогичный период прошлого года
  // Расчёт процентов теперь происходит на фронтенде
  // Поля ppChange, ppChangeAbsolute, ytdChange, ytdChangeAbsolute удалены
  // Поля из mart.balance (аналитика)
  client_type?: string;
  client_segment?: string;
  product_code?: string;
  portfolio_code?: string;
  currency_code?: string;
  // Служебные поля
  id: string;
  period_date?: string;
  description?: string;
  sortOrder?: number;
}

export interface PeriodParams {
  periodDate?: Date;
  dateFrom?: Date;
  dateTo?: Date;
}
