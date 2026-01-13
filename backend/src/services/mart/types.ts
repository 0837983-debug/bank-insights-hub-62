/**
 * Common types and interfaces for MART services
 */

export interface KPIMetric {
  id: string;
  title: string;
  value: number;
  description: string;
  change: number;
  ytdChange?: number;
  category: string;
  icon?: string;
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
