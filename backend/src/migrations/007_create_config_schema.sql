-- Create new config schema tables for ARM-driven dashboard configuration
-- Tables: layouts, components, layout_component_mapping, component_fields
-- Note: schema "config" is created in 001_create_schemas.sql

BEGIN;

-- 1) Layouts registry
CREATE TABLE IF NOT EXISTS config.layouts (
  id                VARCHAR(100) PRIMARY KEY,
  name              VARCHAR(200) NOT NULL,
  description       TEXT,
  status            VARCHAR(50),                 -- e.g., 'draft', 'published', 'archived'
  is_active         BOOLEAN DEFAULT TRUE,
  is_default        BOOLEAN DEFAULT FALSE,
  owner_user_id     VARCHAR(100),
  tags              TEXT[],                      -- simple tags for search/filtering
  category          VARCHAR(100),
  display_order     INTEGER DEFAULT 0,
  settings          JSONB,                       -- layout-level settings

  created_by        VARCHAR(100),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by        VARCHAR(100),
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by        VARCHAR(100),
  deleted_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_layouts_is_active ON config.layouts(is_active);
CREATE INDEX IF NOT EXISTS idx_layouts_is_default ON config.layouts(is_default);
CREATE INDEX IF NOT EXISTS idx_layouts_display_order ON config.layouts(display_order);
CREATE INDEX IF NOT EXISTS idx_layouts_category ON config.layouts(category);

-- 2) Global components library
CREATE TABLE IF NOT EXISTS config.components (
  id                VARCHAR(200) PRIMARY KEY,    -- e.g., 'capital_card', 'income_structure_table'
  component_type    VARCHAR(50) NOT NULL,        -- 'container' | 'card' | 'table' | 'chart' | 'filter'
  title             VARCHAR(200),
  label             VARCHAR(200),
  tooltip           VARCHAR(500),
  icon              VARCHAR(200),

  data_source_key   VARCHAR(200),
  action_type       VARCHAR(100),
  action_target     VARCHAR(200),
  action_params     JSONB,
  settings          JSONB,                       -- component-level settings
  description       TEXT,
  category          VARCHAR(100),

  is_active         BOOLEAN DEFAULT TRUE,
  created_by        VARCHAR(100),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by        VARCHAR(100),
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by        VARCHAR(100),
  deleted_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_components_type ON config.components(component_type);
CREATE INDEX IF NOT EXISTS idx_components_is_active ON config.components(is_active);
CREATE INDEX IF NOT EXISTS idx_components_category ON config.components(category);

-- 3) Mapping: where components are used in layouts (instances with hierarchy)
CREATE TABLE IF NOT EXISTS config.layout_component_mapping (
  id                      SERIAL PRIMARY KEY,
  layout_id               VARCHAR(100) NOT NULL REFERENCES config.layouts(id) ON DELETE CASCADE,
  component_id            VARCHAR(200) NOT NULL REFERENCES config.components(id) ON DELETE RESTRICT,
  instance_id             VARCHAR(200) NOT NULL,      -- unique per layout
  parent_instance_id      VARCHAR(200),               -- references another instance_id within same layout
  display_order           INTEGER DEFAULT 0,
  is_visible              BOOLEAN DEFAULT TRUE,

  title_override          VARCHAR(200),
  label_override          VARCHAR(200),
  tooltip_override        VARCHAR(500),
  icon_override           VARCHAR(200),
  data_source_key_override VARCHAR(200),
  action_params_override  JSONB,
  settings_override       JSONB,

  created_by              VARCHAR(100),
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by              VARCHAR(100),
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by              VARCHAR(100),
  deleted_at              TIMESTAMP
);

-- Uniqueness of instance within layout
CREATE UNIQUE INDEX IF NOT EXISTS uq_lcm_layout_instance ON config.layout_component_mapping(layout_id, instance_id);
CREATE INDEX IF NOT EXISTS idx_lcm_layout ON config.layout_component_mapping(layout_id);
CREATE INDEX IF NOT EXISTS idx_lcm_parent ON config.layout_component_mapping(parent_instance_id);
CREATE INDEX IF NOT EXISTS idx_lcm_component ON config.layout_component_mapping(component_id);
CREATE INDEX IF NOT EXISTS idx_lcm_display_order ON config.layout_component_mapping(display_order);
CREATE INDEX IF NOT EXISTS idx_lcm_is_visible ON config.layout_component_mapping(is_visible);

-- 4) Component fields (columns/metrics)
CREATE TABLE IF NOT EXISTS config.component_fields (
  id                SERIAL PRIMARY KEY,
  component_id      VARCHAR(200) NOT NULL REFERENCES config.components(id) ON DELETE CASCADE,
  field_id          VARCHAR(200) NOT NULL,       -- e.g., 'value', 'change_pptd', 'segment'
  field_type        VARCHAR(50) NOT NULL,        -- e.g., 'number', 'percent', 'string', 'date'
  label             VARCHAR(200),
  description       TEXT,
  data_key          VARCHAR(200),                -- mapping to datasource field
  format_id         VARCHAR(100) REFERENCES config.formats(id) ON DELETE SET NULL,
  parent_field_id   VARCHAR(200),                -- for hierarchical fields
  is_visible        BOOLEAN DEFAULT TRUE,
  is_sortable       BOOLEAN DEFAULT FALSE,
  width             INTEGER,
  align             VARCHAR(20),                 -- 'left' | 'right' | 'center'
  settings          JSONB,
  display_order     INTEGER DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,

  created_by        VARCHAR(100),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by        VARCHAR(100),
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by        VARCHAR(100),
  deleted_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cf_component ON config.component_fields(component_id);
CREATE INDEX IF NOT EXISTS idx_cf_field_id ON config.component_fields(field_id);
CREATE INDEX IF NOT EXISTS idx_cf_display_order ON config.component_fields(display_order);
CREATE INDEX IF NOT EXISTS idx_cf_is_active ON config.component_fields(is_active);
CREATE INDEX IF NOT EXISTS idx_cf_parent_field ON config.component_fields(parent_field_id);

COMMIT;


