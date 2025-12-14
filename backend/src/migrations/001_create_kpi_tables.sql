-- Create schema for dashboard data
CREATE SCHEMA IF NOT EXISTS dashboard;

-- KPI Categories table
CREATE TABLE IF NOT EXISTS dashboard.kpi_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPI Metrics table
CREATE TABLE IF NOT EXISTS dashboard.kpi_metrics (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    value VARCHAR(50) NOT NULL,
    subtitle VARCHAR(200),
    description TEXT,
    change DECIMAL(10, 2),
    ytd_change DECIMAL(10, 2),
    category_id VARCHAR(50) REFERENCES dashboard.kpi_categories(id),
    icon_name VARCHAR(100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Data table (for hierarchical financial tables)
CREATE TABLE IF NOT EXISTS dashboard.table_data (
    id SERIAL PRIMARY KEY,
    table_id VARCHAR(100) NOT NULL,
    row_id VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    value DECIMAL(20, 2),
    percentage DECIMAL(10, 4),
    change DECIMAL(10, 2),
    is_group BOOLEAN DEFAULT FALSE,
    is_total BOOLEAN DEFAULT FALSE,
    parent_id VARCHAR(100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_id, row_id)
);

-- Chart Data table (for storing chart data as JSON)
CREATE TABLE IF NOT EXISTS dashboard.chart_data (
    id SERIAL PRIMARY KEY,
    chart_id VARCHAR(100) NOT NULL UNIQUE,
    data_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_category ON dashboard.kpi_metrics(category_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_sort ON dashboard.kpi_metrics(sort_order);
CREATE INDEX IF NOT EXISTS idx_table_data_table_id ON dashboard.table_data(table_id);
CREATE INDEX IF NOT EXISTS idx_table_data_parent ON dashboard.table_data(table_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_chart_data_chart_id ON dashboard.chart_data(chart_id);

