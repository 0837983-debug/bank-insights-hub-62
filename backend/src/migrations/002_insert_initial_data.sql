-- Insert KPI Categories
INSERT INTO dashboard.kpi_categories (id, name, sort_order) VALUES
    ('finance', 'Финансы', 1),
    ('clients', 'Клиенты', 2),
    ('conversion', 'Конвертация', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert KPI Metrics
INSERT INTO dashboard.kpi_metrics (id, title, value, description, change, ytd_change, category_id, icon_name, sort_order) VALUES
    -- Financial Results
    ('capital', 'Капитал', '₽8.2B', 'Совокупный капитал банка, включающий уставный, добавочный и резервный капитал для покрытия рисков.', 5.2, 12.7, 'finance', 'LandmarkIcon', 1),
    ('ebitda', 'EBITDA', '₽2.1B', 'Прибыль до вычета процентов, налогов, износа и амортизации, скорректированная на созданные резервы.', 12.3, 8.4, 'finance', 'TrendingUpIcon', 2),
    ('cost-to-income', 'Cost-to-Income', '42.5%', 'Отношение операционных расходов к операционным доходам. Показывает эффективность управления расходами.', -3.1, -5.2, 'finance', 'PercentIcon', 3),
    ('roa', 'ROA', '2.8%', 'Return on Assets — отношение чистой прибыли к средним активам. Показывает эффективность использования активов.', 0.4, 1.2, 'finance', 'ActivityIcon', 4),
    ('roe', 'ROE', '18.2%', 'Return on Equity — отношение чистой прибыли к собственному капиталу. Показывает доходность для акционеров.', 2.1, -0.3, 'finance', 'WalletIcon', 5),
    
    -- Client Base
    ('mau', 'MAU', '2.4M', 'Число уникальных клиентов, совершивших ≥1 операцию за месяц', 8.5, 15.2, 'clients', 'UsersIcon', 1),
    ('dau', 'DAU', '785K', 'Число уникальных клиентов, совершивших ≥1 операцию за день', 6.2, 11.8, 'clients', 'UserCheckIcon', 2),
    ('arpu', 'ARPU', '₽1,475', 'Средний доход на одного клиента за период', 5.8, 9.4, 'clients', 'WalletIcon', 3),
    ('retention', 'Retention', '78.5%', 'Доля клиентов, совершивших ≥1 операцию и в текущем, и в предыдущем месяце', 2.1, 3.8, 'clients', 'TrendingUpIcon', 4),
    ('churn', 'Churn', '4.2%', 'Доля клиентов, активных в прошлом месяце, но не совершивших операций в текущем', -1.3, -2.1, 'clients', 'UserMinusIcon', 5),
    
    -- Conversion
    ('fx-transactions', 'FX-сделки', '705.5K', 'Общее количество конверсионных операций за период', 9.4, 18.7, 'conversion', 'RefreshCwIcon', 1),
    ('fx-avg-check', 'Средний чек FX', '₽214.8K', 'Средний объём одной конверсионной операции', 3.2, 5.6, 'conversion', 'BarChart3Icon', 2),
    ('fx-spread', 'FX-спред', '1.82%', 'Средневзвешенный спред по всем FX-операциям', -0.08, -0.15, 'conversion', 'PercentIcon', 3),
    ('fx-clients', 'FX клиенты', '186.4K', 'Количество уникальных клиентов, совершавших конверсии', 12.6, 22.4, 'conversion', 'UsersIcon', 4),
    ('fx-per-client', 'FX на клиента', '3.78', 'Среднее количество FX-операций на одного клиента', -2.8, -1.5, 'conversion', 'ActivityIcon', 5)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    change = EXCLUDED.change,
    ytd_change = EXCLUDED.ytd_change,
    category_id = EXCLUDED.category_id,
    icon_name = EXCLUDED.icon_name,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP;

