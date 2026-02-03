// src/mocks/layoutMock.ts
import type { LayoutColumn } from '@/lib/api';

export const mockAssetsTableColumns: LayoutColumn[] = [
  { id: 'class', fieldType: 'dimension', label: 'Класс', type: 'string' },
  { id: 'section', fieldType: 'dimension', label: 'Раздел', type: 'string' },
  { id: 'item', fieldType: 'dimension', label: 'Статья', type: 'string' },
  { id: 'sub_item', fieldType: 'dimension', label: 'Подстатья', type: 'string' },
  { 
    id: 'value', 
    fieldType: 'measure', 
    label: 'Значение', 
    type: 'number',
    format: 'currency_rub',
    aggregation: 'sum',
    sub_columns: [
      { 
        id: 'ppChange', 
        fieldType: 'calculated',
        label: 'Изм. к ПП, %',
        type: 'number',
        format: 'percent',
        calculationConfig: { type: 'percent_change', current: 'value', base: 'ppValue' }
      },
      { 
        id: 'ytdChange', 
        fieldType: 'calculated',
        label: 'Изм. YTD, %',
        type: 'number',
        format: 'percent',
        calculationConfig: { type: 'percent_change', current: 'value', base: 'pyValue' }
      },
      { 
        id: 'ppChangeAbsolute', 
        fieldType: 'calculated',
        label: 'Изм. к ПП',
        type: 'number',
        format: 'currency_rub',
        calculationConfig: { type: 'diff', minuend: 'value', subtrahend: 'ppValue' }
      },
      { 
        id: 'ytdChangeAbsolute', 
        fieldType: 'calculated',
        label: 'Изм. YTD',
        type: 'number',
        format: 'currency_rub',
        calculationConfig: { type: 'diff', minuend: 'value', subtrahend: 'pyValue' }
      }
    ]
  },
  { id: 'ppValue', fieldType: 'measure', label: 'Пред. период', type: 'number', format: 'currency_rub' },
  { id: 'pyValue', fieldType: 'measure', label: 'Прош. год', type: 'number', format: 'currency_rub' }
];

// Флаг для переключения между моками и API
// Переключен на false после интеграции с API (Этап 3 FIELD_TYPE_REFACTOR)
export const USE_MOCKS = false;
