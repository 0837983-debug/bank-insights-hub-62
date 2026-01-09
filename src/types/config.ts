// Configuration schema types based on PostgreSQL dump

export interface Format {
  id: string;
  name: string;
  kind: 'number' | 'currency' | 'percent' | 'date';
  prefixUnitSymbol?: string;
  suffixUnitSymbol?: string;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  thousandSeparator: boolean;
  shorten: boolean;
  multiplier?: number;
  currency?: string;
  pattern?: string;
  colorRules?: Record<string, unknown>;
  symbolRules?: Record<string, unknown>;
  customRules?: Record<string, unknown>;
  description?: string;
  example?: string;
  displayOrder: number;
  category?: string;
  isActive: boolean;
  isSystem: boolean;
}

export interface Component {
  id: string;
  componentType: 'container' | 'card' | 'table' | 'filter' | 'chart';
  title?: string;
  label?: string;
  tooltip?: string;
  icon?: string;
  dataSourceKey?: string;
  actionType?: string;
  actionTarget?: string;
  actionParams?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  description?: string;
  category?: string;
  isActive: boolean;
}

export interface ComponentField {
  id: number;
  componentId: string;
  fieldId: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean';
  label?: string;
  description?: string;
  dataKey?: string;
  formatId?: string;
  parentFieldId?: string;
  isVisible: boolean;
  isSortable: boolean;
  width?: number;
  align?: 'left' | 'center' | 'right';
  settings?: Record<string, unknown>;
  displayOrder: number;
  isActive: boolean;
}

export interface Layout {
  id: string;
  name: string;
  description?: string;
  status?: string;
  isActive: boolean;
  isDefault: boolean;
  ownerUserId?: string;
  tags?: string[];
  category?: string;
  displayOrder: number;
  settings?: Record<string, unknown>;
}

export interface LayoutComponentMapping {
  id: number;
  layoutId: string;
  componentId: string;
  instanceId: string;
  parentInstanceId?: string;
  displayOrder: number;
  isVisible: boolean;
  titleOverride?: string;
  labelOverride?: string;
  tooltipOverride?: string;
  iconOverride?: string;
  dataSourceKeyOverride?: string;
  actionParamsOverride?: Record<string, unknown>;
  settingsOverride?: Record<string, unknown>;
}

export interface ChangesHistory {
  id: number;
  tableName: string;
  recordId: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changeType: string;
  changedBy: string;
  changedAt: string;
  metadata?: Record<string, unknown>;
}

// Mock data extracted from SQL dump
export const mockFormats: Format[] = [
  {
    id: 'currency_rub',
    name: 'Рубли с сокращением',
    kind: 'number',
    prefixUnitSymbol: '₽',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    thousandSeparator: true,
    shorten: true,
    displayOrder: 1,
    category: 'currency',
    isActive: true,
    isSystem: true,
    description: 'Форматирует рубли с автоматическим сокращением больших чисел (K/M/B)',
    example: '8200000 → ₽8.2B'
  },
  {
    id: 'currency_rub_full',
    name: 'Рубли полный формат',
    kind: 'number',
    prefixUnitSymbol: '₽',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    thousandSeparator: true,
    shorten: false,
    displayOrder: 2,
    category: 'currency',
    isActive: true,
    isSystem: true,
    description: 'Форматирует рубли в полном формате с двумя знаками после запятой',
    example: '1475 → ₽1,475.00'
  },
  {
    id: 'percent',
    name: 'Проценты',
    kind: 'number',
    suffixUnitSymbol: '%',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    thousandSeparator: false,
    shorten: false,
    displayOrder: 3,
    category: 'percent',
    isActive: true,
    isSystem: true,
    description: 'Форматирует числа как проценты с одним знаком после запятой',
    example: '78.5 → 78.5%'
  },
  {
    id: 'number',
    name: 'Число',
    kind: 'number',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    thousandSeparator: true,
    shorten: false,
    displayOrder: 4,
    category: 'number',
    isActive: true,
    isSystem: true,
    description: 'Форматирует числа с разделителем тысяч, без знаков после запятой',
    example: '1234567 → 1 234 567'
  },
  {
    id: 'number_short',
    name: 'Число с сокращением',
    kind: 'number',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    thousandSeparator: true,
    shorten: true,
    displayOrder: 5,
    category: 'number',
    isActive: true,
    isSystem: true,
    description: 'Форматирует числа с разделителем тысяч и автоматическим сокращением (K/M/B)',
    example: '2400000 → 2.4M'
  },
  {
    id: 'currency_billions',
    name: 'Миллиарды рублей',
    kind: 'number',
    suffixUnitSymbol: ' млрд ₽',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
    thousandSeparator: true,
    shorten: false,
    displayOrder: 6,
    category: 'currency',
    isActive: true,
    isSystem: true,
    description: 'Форматирует числа в миллиардах рублей',
    example: '8200000000 → 8.2 млрд ₽'
  }
];

export const mockComponents: Component[] = [
  { id: 'section_financial_results', componentType: 'container', title: 'Финансовые результаты', description: 'Секция: Финансовые результаты', category: 'section', isActive: true },
  { id: 'capital_card', componentType: 'card', title: 'Капитал', label: 'Капитал', tooltip: 'Совокупный капитал банка', icon: 'Landmark', dataSourceKey: 'capital', category: 'card', isActive: true, settings: { YTD: 'percent', PPTD: 'percent', value: 'currency_rub' } },
  { id: 'ebitda_card', componentType: 'card', title: 'EBITDA', label: 'EBITDA', tooltip: 'Прибыль до вычета процентов, налогов, износа и амортизации', icon: 'TrendingUp', dataSourceKey: 'ebitda', category: 'card', isActive: true },
  { id: 'cost_to_income_card', componentType: 'card', title: 'Cost-to-Income', label: 'Cost-to-Income', tooltip: 'Отношение операционных расходов к операционным доходам', icon: 'Percent', dataSourceKey: 'cost_to_income', category: 'card', isActive: true },
  { id: 'roa_card', componentType: 'card', title: 'ROA', label: 'ROA', tooltip: 'Return on Assets - эффективность использования активов', icon: 'Activity', dataSourceKey: 'roa', category: 'card', isActive: true },
  { id: 'roe_card', componentType: 'card', title: 'ROE', label: 'ROE', tooltip: 'Return on Equity - доходность для акционеров', icon: 'Wallet', dataSourceKey: 'roe', category: 'card', isActive: true },
  { id: 'income_structure_table', componentType: 'table', title: 'Структура доходов', label: 'Структура доходов', dataSourceKey: 'income_structure', category: 'table', isActive: true },
  { id: 'expenses_table', componentType: 'table', title: 'Расходы и резервы', label: 'Расходы и резервы', dataSourceKey: 'expenses', category: 'table', isActive: true },
  { id: 'section_balance', componentType: 'container', title: 'Баланс', description: 'Секция: Баланс', category: 'section', isActive: true },
  { id: 'assets_table', componentType: 'table', title: 'Активы', label: 'Активы', dataSourceKey: 'assets', category: 'table', isActive: true },
  { id: 'liabilities_table', componentType: 'table', title: 'Пассивы', label: 'Пассивы', dataSourceKey: 'liabilities', category: 'table', isActive: true },
  { id: 'section_client_base', componentType: 'container', title: 'Клиентская база', description: 'Секция: Клиентская база', category: 'section', isActive: true },
  { id: 'mau_card', componentType: 'card', title: 'MAU', label: 'MAU', tooltip: 'Число уникальных клиентов, совершивших ≥1 операцию за месяц', icon: 'Users', dataSourceKey: 'mau', category: 'card', isActive: true },
  { id: 'dau_card', componentType: 'card', title: 'DAU', label: 'DAU', tooltip: 'Число уникальных клиентов за день', icon: 'UserCheck', dataSourceKey: 'dau', category: 'card', isActive: true },
  { id: 'arpu_card', componentType: 'card', title: 'ARPU', label: 'ARPU', tooltip: 'Средний доход на одного клиента за период', icon: 'Wallet', dataSourceKey: 'arpu', category: 'card', isActive: true },
  { id: 'retention_card', componentType: 'card', title: 'Retention', label: 'Retention', tooltip: 'Доля клиентов, совершивших операции в обоих месяцах', icon: 'TrendingUp', dataSourceKey: 'retention', category: 'card', isActive: true },
  { id: 'churn_card', componentType: 'card', title: 'Churn', label: 'Churn', tooltip: 'Доля неактивных клиентов', icon: 'UserMinus', dataSourceKey: 'churn', category: 'card', isActive: true },
  { id: 'client_segmentation_table', componentType: 'table', title: 'Сегментация клиентов', label: 'Сегментация клиентов', dataSourceKey: 'client_base_segmentation', category: 'table', isActive: true },
  { id: 'section_conversion', componentType: 'container', title: 'Конвертация валют', description: 'Секция: Конвертация валют', category: 'section', isActive: true },
  { id: 'fx_transactions_card', componentType: 'card', title: 'FX-сделки', label: 'FX-сделки', tooltip: 'Общее количество конверсионных операций', icon: 'RefreshCw', dataSourceKey: 'fx_transactions', category: 'card', isActive: true },
  { id: 'fx_avg_check_card', componentType: 'card', title: 'Средний чек FX', label: 'Средний чек FX', tooltip: 'Средний объём одной конверсионной операции', icon: 'BarChart3', dataSourceKey: 'fx_avg_check', category: 'card', isActive: true },
  { id: 'fx_spread_card', componentType: 'card', title: 'FX-спред', label: 'FX-спред', tooltip: 'Средневзвешенный спред по всем FX-операциям', icon: 'Percent', dataSourceKey: 'fx_spread', category: 'card', isActive: true },
  { id: 'fx_clients_card', componentType: 'card', title: 'FX клиенты', label: 'FX клиенты', tooltip: 'Количество уникальных клиентов, совершавших конверсии', icon: 'Users', dataSourceKey: 'fx_clients', category: 'card', isActive: true },
  { id: 'fx_per_client_card', componentType: 'card', title: 'FX на клиента', label: 'FX на клиента', tooltip: 'Среднее количество FX-операций на одного клиента', icon: 'Activity', dataSourceKey: 'fx_per_client', category: 'card', isActive: true },
  { id: 'conversion_currency_pairs_table', componentType: 'table', title: 'По валютным парам', label: 'По валютным парам', dataSourceKey: 'conversion_currency_pairs', category: 'table', isActive: true },
  { id: 'conversion_client_segments_table', componentType: 'table', title: 'По клиентским сегментам', label: 'По клиентским сегментам', dataSourceKey: 'conversion_client_segments', category: 'table', isActive: true },
  { id: 'filter_group_period', componentType: 'container', title: 'Фильтры: period', description: 'Группа фильтров: period', category: 'filter', isActive: true },
  { id: 'dateFrom', componentType: 'filter', title: 'Дата начала', label: 'Дата начала', dataSourceKey: 'dateFrom', category: 'filter', isActive: true },
  { id: 'dateTo', componentType: 'filter', title: 'Дата окончания', label: 'Дата окончания', dataSourceKey: 'dateTo', category: 'filter', isActive: true },
  { id: 'filter_group_region', componentType: 'container', title: 'Фильтры: region', description: 'Группа фильтров: region', category: 'filter', isActive: true },
  { id: 'region', componentType: 'filter', title: 'Регион', label: 'Регион', dataSourceKey: 'region', category: 'filter', isActive: true, actionParams: { options: [{ label: 'Все регионы', value: 'all' }, { label: 'Москва', value: 'moscow' }, { label: 'Санкт-Петербург', value: 'spb' }, { label: 'Регионы', value: 'regions' }] } }
];

export const mockLayouts: Layout[] = [
  { id: 'main_dashboard', name: 'Основной дашборд', description: 'Главный дашборд с финансовыми показателями', isActive: true, isDefault: true, displayOrder: 1, category: 'dashboard' }
];

export const mockComponentFields: ComponentField[] = [
  { id: 1, componentId: 'income_structure_table', fieldId: 'name', fieldType: 'text', label: 'Наименование', description: 'Измерение', isVisible: true, isSortable: true, displayOrder: 1, isActive: true },
  { id: 2, componentId: 'income_structure_table', fieldId: 'value', fieldType: 'number', label: 'Значение', description: 'Метрика', formatId: 'currency_rub', isVisible: true, isSortable: true, displayOrder: 2, isActive: true },
  { id: 3, componentId: 'income_structure_table', fieldId: 'percentage', fieldType: 'number', label: 'Доля, %', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 3, isActive: true },
  { id: 4, componentId: 'income_structure_table', fieldId: 'change_pptd', fieldType: 'number', label: 'Изм. к ПП', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 4, isActive: true },
  { id: 5, componentId: 'income_structure_table', fieldId: 'change_ytd', fieldType: 'number', label: 'Изм. YTD', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 5, isActive: true },
  { id: 6, componentId: 'expenses_table', fieldId: 'name', fieldType: 'text', label: 'Наименование', description: 'Измерение', isVisible: true, isSortable: true, displayOrder: 1, isActive: true },
  { id: 7, componentId: 'expenses_table', fieldId: 'value', fieldType: 'number', label: 'Значение', description: 'Метрика', formatId: 'currency_rub', isVisible: true, isSortable: true, displayOrder: 2, isActive: true },
  { id: 8, componentId: 'expenses_table', fieldId: 'percentage', fieldType: 'number', label: 'Доля, %', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 3, isActive: true },
  { id: 9, componentId: 'expenses_table', fieldId: 'change_pptd', fieldType: 'number', label: 'Изм. к ПП', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 4, isActive: true },
  { id: 10, componentId: 'expenses_table', fieldId: 'change_ytd', fieldType: 'number', label: 'Изм. YTD', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 5, isActive: true },
  { id: 11, componentId: 'assets_table', fieldId: 'name', fieldType: 'text', label: 'Наименование', description: 'Измерение', isVisible: true, isSortable: true, displayOrder: 1, isActive: true },
  { id: 12, componentId: 'assets_table', fieldId: 'value', fieldType: 'number', label: 'Значение', description: 'Метрика', formatId: 'currency_rub', isVisible: true, isSortable: true, displayOrder: 2, isActive: true },
  { id: 13, componentId: 'assets_table', fieldId: 'percentage', fieldType: 'number', label: 'Доля, %', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 3, isActive: true },
  { id: 14, componentId: 'assets_table', fieldId: 'change_pptd', fieldType: 'number', label: 'Изм. к ПП', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 4, isActive: true },
  { id: 15, componentId: 'liabilities_table', fieldId: 'name', fieldType: 'text', label: 'Наименование', description: 'Измерение', isVisible: true, isSortable: true, displayOrder: 1, isActive: true },
  { id: 16, componentId: 'liabilities_table', fieldId: 'value', fieldType: 'number', label: 'Значение', description: 'Метрика', formatId: 'currency_rub', isVisible: true, isSortable: true, displayOrder: 2, isActive: true },
  { id: 17, componentId: 'liabilities_table', fieldId: 'percentage', fieldType: 'number', label: 'Доля, %', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 3, isActive: true },
  { id: 18, componentId: 'liabilities_table', fieldId: 'change_pptd', fieldType: 'number', label: 'Изм. к ПП', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 4, isActive: true },
  { id: 19, componentId: 'client_segmentation_table', fieldId: 'segment', fieldType: 'text', label: 'Сегмент', description: 'Измерение', isVisible: true, isSortable: true, displayOrder: 1, isActive: true },
  { id: 20, componentId: 'client_segmentation_table', fieldId: 'clientCount', fieldType: 'number', label: 'Кол-во клиентов', description: 'Метрика', formatId: 'number', isVisible: true, isSortable: true, displayOrder: 2, isActive: true },
  { id: 21, componentId: 'client_segmentation_table', fieldId: 'assets', fieldType: 'number', label: 'Активы, млрд ₽', description: 'Метрика', formatId: 'number_short', isVisible: true, isSortable: true, displayOrder: 3, isActive: true },
  { id: 22, componentId: 'client_segmentation_table', fieldId: 'commissionIncome', fieldType: 'number', label: 'Комиссионный доход', description: 'Метрика', formatId: 'currency_rub', isVisible: true, isSortable: true, displayOrder: 4, isActive: true },
  { id: 23, componentId: 'client_segmentation_table', fieldId: 'mau', fieldType: 'number', label: 'MAU', description: 'Метрика', formatId: 'number_short', isVisible: true, isSortable: true, displayOrder: 5, isActive: true },
  { id: 24, componentId: 'conversion_currency_pairs_table', fieldId: 'name', fieldType: 'text', label: 'Валютная пара', description: 'Измерение', isVisible: true, isSortable: true, displayOrder: 1, isActive: true },
  { id: 25, componentId: 'conversion_currency_pairs_table', fieldId: 'transactions', fieldType: 'number', label: 'Транзакции', description: 'Метрика', formatId: 'number', isVisible: true, isSortable: true, displayOrder: 2, isActive: true },
  { id: 26, componentId: 'conversion_currency_pairs_table', fieldId: 'volumeRub', fieldType: 'number', label: 'Объём, млрд ₽', description: 'Метрика', formatId: 'number_short', isVisible: true, isSortable: true, displayOrder: 3, isActive: true },
  { id: 27, componentId: 'conversion_currency_pairs_table', fieldId: 'transactionsChange', fieldType: 'number', label: 'Изм. транзакций, %', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 4, isActive: true },
  { id: 28, componentId: 'conversion_currency_pairs_table', fieldId: 'volumeRubChange', fieldType: 'number', label: 'Изм. объёма, %', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 5, isActive: true },
  { id: 29, componentId: 'conversion_client_segments_table', fieldId: 'name', fieldType: 'text', label: 'Сегмент', description: 'Измерение', isVisible: true, isSortable: true, displayOrder: 1, isActive: true },
  { id: 30, componentId: 'conversion_client_segments_table', fieldId: 'transactions', fieldType: 'number', label: 'Транзакции', description: 'Метрика', formatId: 'number', isVisible: true, isSortable: true, displayOrder: 2, isActive: true },
  { id: 31, componentId: 'conversion_client_segments_table', fieldId: 'volumeRub', fieldType: 'number', label: 'Объём, млрд ₽', description: 'Метрика', formatId: 'number_short', isVisible: true, isSortable: true, displayOrder: 3, isActive: true },
  { id: 32, componentId: 'conversion_client_segments_table', fieldId: 'transactionsChange', fieldType: 'number', label: 'Изм. транзакций, %', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 4, isActive: true },
  { id: 33, componentId: 'conversion_client_segments_table', fieldId: 'volumeRubChange', fieldType: 'number', label: 'Изм. объёма, %', description: 'Метрика', formatId: 'percent', isVisible: true, isSortable: true, displayOrder: 5, isActive: true }
];

export const mockLayoutMappings: LayoutComponentMapping[] = [
  { id: 1, layoutId: 'main_dashboard', componentId: 'section_financial_results', instanceId: 'section_financial_results', displayOrder: 1, isVisible: true },
  { id: 2, layoutId: 'main_dashboard', componentId: 'capital_card', instanceId: 'capital_card', parentInstanceId: 'section_financial_results', displayOrder: 1, isVisible: true },
  { id: 3, layoutId: 'main_dashboard', componentId: 'ebitda_card', instanceId: 'ebitda_card', parentInstanceId: 'section_financial_results', displayOrder: 2, isVisible: true },
  { id: 4, layoutId: 'main_dashboard', componentId: 'cost_to_income_card', instanceId: 'cost_to_income_card', parentInstanceId: 'section_financial_results', displayOrder: 3, isVisible: true },
  { id: 5, layoutId: 'main_dashboard', componentId: 'roa_card', instanceId: 'roa_card', parentInstanceId: 'section_financial_results', displayOrder: 4, isVisible: true },
  { id: 6, layoutId: 'main_dashboard', componentId: 'roe_card', instanceId: 'roe_card', parentInstanceId: 'section_financial_results', displayOrder: 5, isVisible: true },
  { id: 7, layoutId: 'main_dashboard', componentId: 'income_structure_table', instanceId: 'income_structure_table', parentInstanceId: 'section_financial_results', displayOrder: 6, isVisible: true },
  { id: 8, layoutId: 'main_dashboard', componentId: 'expenses_table', instanceId: 'expenses_table', parentInstanceId: 'section_financial_results', displayOrder: 7, isVisible: true },
  { id: 9, layoutId: 'main_dashboard', componentId: 'section_balance', instanceId: 'section_balance', displayOrder: 2, isVisible: true },
  { id: 10, layoutId: 'main_dashboard', componentId: 'assets_table', instanceId: 'assets_table', parentInstanceId: 'section_balance', displayOrder: 1, isVisible: true },
  { id: 11, layoutId: 'main_dashboard', componentId: 'liabilities_table', instanceId: 'liabilities_table', parentInstanceId: 'section_balance', displayOrder: 2, isVisible: true },
  { id: 12, layoutId: 'main_dashboard', componentId: 'section_client_base', instanceId: 'section_client_base', displayOrder: 3, isVisible: true },
  { id: 13, layoutId: 'main_dashboard', componentId: 'mau_card', instanceId: 'mau_card', parentInstanceId: 'section_client_base', displayOrder: 1, isVisible: true },
  { id: 14, layoutId: 'main_dashboard', componentId: 'dau_card', instanceId: 'dau_card', parentInstanceId: 'section_client_base', displayOrder: 2, isVisible: true },
  { id: 15, layoutId: 'main_dashboard', componentId: 'arpu_card', instanceId: 'arpu_card', parentInstanceId: 'section_client_base', displayOrder: 3, isVisible: true },
  { id: 16, layoutId: 'main_dashboard', componentId: 'retention_card', instanceId: 'retention_card', parentInstanceId: 'section_client_base', displayOrder: 4, isVisible: true },
  { id: 17, layoutId: 'main_dashboard', componentId: 'churn_card', instanceId: 'churn_card', parentInstanceId: 'section_client_base', displayOrder: 5, isVisible: true },
  { id: 18, layoutId: 'main_dashboard', componentId: 'client_segmentation_table', instanceId: 'client_segmentation_table', parentInstanceId: 'section_client_base', displayOrder: 6, isVisible: true },
  { id: 19, layoutId: 'main_dashboard', componentId: 'section_conversion', instanceId: 'section_conversion', displayOrder: 4, isVisible: true },
  { id: 20, layoutId: 'main_dashboard', componentId: 'fx_transactions_card', instanceId: 'fx_transactions_card', parentInstanceId: 'section_conversion', displayOrder: 1, isVisible: true },
  { id: 21, layoutId: 'main_dashboard', componentId: 'fx_avg_check_card', instanceId: 'fx_avg_check_card', parentInstanceId: 'section_conversion', displayOrder: 2, isVisible: true },
  { id: 22, layoutId: 'main_dashboard', componentId: 'fx_spread_card', instanceId: 'fx_spread_card', parentInstanceId: 'section_conversion', displayOrder: 3, isVisible: true },
  { id: 23, layoutId: 'main_dashboard', componentId: 'fx_clients_card', instanceId: 'fx_clients_card', parentInstanceId: 'section_conversion', displayOrder: 4, isVisible: true },
  { id: 24, layoutId: 'main_dashboard', componentId: 'fx_per_client_card', instanceId: 'fx_per_client_card', parentInstanceId: 'section_conversion', displayOrder: 5, isVisible: true },
  { id: 25, layoutId: 'main_dashboard', componentId: 'conversion_currency_pairs_table', instanceId: 'conversion_currency_pairs_table', parentInstanceId: 'section_conversion', displayOrder: 6, isVisible: true },
  { id: 26, layoutId: 'main_dashboard', componentId: 'conversion_client_segments_table', instanceId: 'conversion_client_segments_table', parentInstanceId: 'section_conversion', displayOrder: 7, isVisible: true }
];
