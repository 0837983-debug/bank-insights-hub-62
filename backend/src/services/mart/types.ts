/**
 * Common types and interfaces for MART services
 */

export interface KPIMetric {
  id: string;
  periodDate: string; // актуальная дата периода (YYYY-MM-DD)
  value: number;
  previousValue: number; // значение предыдущего периода
  ytdValue?: number; // значение на конец прошлого года
  ppChange: number; // изменение относительно предыдущего периода в долях
  ppChangeAbsolute?: number; // абсолютное изменение относительно предыдущего периода
  ytdChange?: number; // изменение YTD в долях
  ytdChangeAbsolute?: number; // абсолютное изменение YTD
}

export interface TableRowData {
  id: string;
  name: string;
  description?: string;
  value: number;
  percentage?: number;
  change?: number;
  changeYtd?: number;
  isGroup?: boolean;
  isTotal?: boolean;
  parentId?: string;
  sortOrder: number;
}

export interface PeriodParams {
  periodDate?: Date;
  dateFrom?: Date;
  dateTo?: Date;
}
