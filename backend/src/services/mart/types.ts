/**
 * Common types and interfaces for MART services
 */

export interface KPIMetric {
  id: string;
  value: number;
  change: number; // изменение относительно предыдущего периода в процентах
  ytdChange?: number; // изменение YTD в процентах
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
