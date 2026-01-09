-- Create formats table with full structure for ARM editing
-- This migration creates/updates the formats table with all necessary fields

-- Drop existing table if it exists (to recreate with new structure)
DROP TABLE IF EXISTS config.formats CASCADE;

-- Create formats table with complete structure
CREATE TABLE config.formats (
    -- Identification
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    
    -- Basic formatting parameters
    kind VARCHAR(50) NOT NULL, -- 'number', 'currency', 'percent', 'date'
    prefix_unit_symbol VARCHAR(20), -- Symbol before number (e.g., '₽')
    suffix_unit_symbol VARCHAR(50), -- Symbol after number (e.g., '%', ' млрд ₽')
    minimum_fraction_digits INTEGER DEFAULT 0, -- Min decimal places (0-10)
    maximum_fraction_digits INTEGER DEFAULT 0, -- Max decimal places (0-10)
    thousand_separator BOOLEAN DEFAULT FALSE, -- Use thousand separator
    shorten BOOLEAN DEFAULT FALSE, -- Use short format (K, M, B)
    
    -- Additional optional parameters
    multiplier DECIMAL(10, 4), -- Multiplier for value (e.g., 0.001 for thousands)
    currency VARCHAR(10), -- Currency code (e.g., 'RUB', 'USD') if kind = 'currency'
    pattern VARCHAR(200), -- Custom formatting pattern if needed
    
    -- Extended capabilities (JSONB)
    color_rules JSONB, -- Color formatting rules (e.g., green for positive, red for negative)
    symbol_rules JSONB, -- Symbol rules (e.g., '+' for positive values)
    custom_rules JSONB, -- Any other custom rules in JSON
    
    -- For ARM editing convenience
    description TEXT, -- Format description for administrator
    example VARCHAR(200), -- Usage example (e.g., '8200000 → ₽8.2B')
    display_order INTEGER DEFAULT 0, -- Display order in ARM list
    category VARCHAR(50), -- Category for grouping in ARM (e.g., 'currency', 'number', 'percent')
    
    -- Audit and management
    is_active BOOLEAN DEFAULT TRUE, -- Is format active (for soft delete)
    is_system BOOLEAN DEFAULT FALSE, -- System format (cannot be deleted, only deactivated)
    created_by VARCHAR(100), -- Who created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When created
    updated_by VARCHAR(100), -- Who last updated
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When last updated
    deleted_by VARCHAR(100), -- Who deleted (if deleted)
    deleted_at TIMESTAMP, -- When deleted (if deleted)
    
    -- Validation
    validation_rules JSONB -- Validation rules in JSON (e.g., min/max values for digits)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_formats_category ON config.formats(category);
CREATE INDEX IF NOT EXISTS idx_formats_display_order ON config.formats(display_order);
CREATE INDEX IF NOT EXISTS idx_formats_is_active ON config.formats(is_active);
CREATE INDEX IF NOT EXISTS idx_formats_kind ON config.formats(kind);

-- Add comments for documentation
COMMENT ON TABLE config.formats IS 'Format definitions for number/currency/percent formatting with full ARM support';
COMMENT ON COLUMN config.formats.name IS 'Human-readable name for ARM interface';
COMMENT ON COLUMN config.formats.description IS 'Format description for administrator';
COMMENT ON COLUMN config.formats.example IS 'Usage example showing input and output';
COMMENT ON COLUMN config.formats.category IS 'Category for grouping in ARM (currency, number, percent)';
COMMENT ON COLUMN config.formats.is_system IS 'System format cannot be deleted, only deactivated';
COMMENT ON COLUMN config.formats.color_rules IS 'JSON object with color rules for conditional formatting';
COMMENT ON COLUMN config.formats.symbol_rules IS 'JSON object with symbol rules for formatting';
COMMENT ON COLUMN config.formats.custom_rules IS 'JSON object with any custom formatting rules';
COMMENT ON COLUMN config.formats.validation_rules IS 'JSON object with validation rules';

