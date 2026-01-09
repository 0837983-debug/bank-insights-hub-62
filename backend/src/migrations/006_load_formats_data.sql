-- Load formats data from layout.json
-- This migration populates the formats table with data from layout.json

-- Insert currency_rub format
INSERT INTO config.formats (
    id, name, kind, prefix_unit_symbol, minimum_fraction_digits, maximum_fraction_digits,
    thousand_separator, shorten, description, example, display_order, category, is_system
) VALUES (
    'currency_rub',
    'Рубли с сокращением',
    'number',
    '₽',
    0,
    2,
    TRUE,
    TRUE,
    'Форматирует рубли с автоматическим сокращением больших чисел (K/M/B)',
    '8200000 → ₽8.2B',
    1,
    'currency',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    kind = EXCLUDED.kind,
    prefix_unit_symbol = EXCLUDED.prefix_unit_symbol,
    minimum_fraction_digits = EXCLUDED.minimum_fraction_digits,
    maximum_fraction_digits = EXCLUDED.maximum_fraction_digits,
    thousand_separator = EXCLUDED.thousand_separator,
    shorten = EXCLUDED.shorten,
    description = EXCLUDED.description,
    example = EXCLUDED.example,
    display_order = EXCLUDED.display_order,
    category = EXCLUDED.category,
    updated_at = CURRENT_TIMESTAMP;

-- Insert currency_rub_full format
INSERT INTO config.formats (
    id, name, kind, prefix_unit_symbol, minimum_fraction_digits, maximum_fraction_digits,
    thousand_separator, shorten, description, example, display_order, category, is_system
) VALUES (
    'currency_rub_full',
    'Рубли полный формат',
    'number',
    '₽',
    2,
    2,
    TRUE,
    FALSE,
    'Форматирует рубли в полном формате с двумя знаками после запятой',
    '1475 → ₽1,475.00',
    2,
    'currency',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    kind = EXCLUDED.kind,
    prefix_unit_symbol = EXCLUDED.prefix_unit_symbol,
    minimum_fraction_digits = EXCLUDED.minimum_fraction_digits,
    maximum_fraction_digits = EXCLUDED.maximum_fraction_digits,
    thousand_separator = EXCLUDED.thousand_separator,
    shorten = EXCLUDED.shorten,
    description = EXCLUDED.description,
    example = EXCLUDED.example,
    display_order = EXCLUDED.display_order,
    category = EXCLUDED.category,
    updated_at = CURRENT_TIMESTAMP;

-- Insert percent format
INSERT INTO config.formats (
    id, name, kind, suffix_unit_symbol, minimum_fraction_digits, maximum_fraction_digits,
    thousand_separator, shorten, description, example, display_order, category, is_system
) VALUES (
    'percent',
    'Проценты',
    'number',
    '%',
    1,
    1,
    FALSE,
    FALSE,
    'Форматирует числа как проценты с одним знаком после запятой',
    '78.5 → 78.5%',
    3,
    'percent',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    kind = EXCLUDED.kind,
    suffix_unit_symbol = EXCLUDED.suffix_unit_symbol,
    minimum_fraction_digits = EXCLUDED.minimum_fraction_digits,
    maximum_fraction_digits = EXCLUDED.maximum_fraction_digits,
    thousand_separator = EXCLUDED.thousand_separator,
    shorten = EXCLUDED.shorten,
    description = EXCLUDED.description,
    example = EXCLUDED.example,
    display_order = EXCLUDED.display_order,
    category = EXCLUDED.category,
    updated_at = CURRENT_TIMESTAMP;

-- Insert number format
INSERT INTO config.formats (
    id, name, kind, minimum_fraction_digits, maximum_fraction_digits,
    thousand_separator, shorten, description, example, display_order, category, is_system
) VALUES (
    'number',
    'Число',
    'number',
    0,
    0,
    TRUE,
    FALSE,
    'Форматирует числа с разделителем тысяч, без знаков после запятой',
    '1234567 → 1 234 567',
    4,
    'number',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    kind = EXCLUDED.kind,
    minimum_fraction_digits = EXCLUDED.minimum_fraction_digits,
    maximum_fraction_digits = EXCLUDED.maximum_fraction_digits,
    thousand_separator = EXCLUDED.thousand_separator,
    shorten = EXCLUDED.shorten,
    description = EXCLUDED.description,
    example = EXCLUDED.example,
    display_order = EXCLUDED.display_order,
    category = EXCLUDED.category,
    updated_at = CURRENT_TIMESTAMP;

-- Insert number_short format
INSERT INTO config.formats (
    id, name, kind, minimum_fraction_digits, maximum_fraction_digits,
    thousand_separator, shorten, description, example, display_order, category, is_system
) VALUES (
    'number_short',
    'Число с сокращением',
    'number',
    0,
    1,
    TRUE,
    TRUE,
    'Форматирует числа с разделителем тысяч и автоматическим сокращением (K/M/B)',
    '2400000 → 2.4M',
    5,
    'number',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    kind = EXCLUDED.kind,
    minimum_fraction_digits = EXCLUDED.minimum_fraction_digits,
    maximum_fraction_digits = EXCLUDED.maximum_fraction_digits,
    thousand_separator = EXCLUDED.thousand_separator,
    shorten = EXCLUDED.shorten,
    description = EXCLUDED.description,
    example = EXCLUDED.example,
    display_order = EXCLUDED.display_order,
    category = EXCLUDED.category,
    updated_at = CURRENT_TIMESTAMP;

-- Insert currency_billions format
INSERT INTO config.formats (
    id, name, kind, suffix_unit_symbol, minimum_fraction_digits, maximum_fraction_digits,
    thousand_separator, shorten, description, example, display_order, category, is_system
) VALUES (
    'currency_billions',
    'Миллиарды рублей',
    'number',
    ' млрд ₽',
    1,
    2,
    TRUE,
    FALSE,
    'Форматирует числа в миллиардах рублей',
    '8200000000 → 8.2 млрд ₽',
    6,
    'currency',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    kind = EXCLUDED.kind,
    suffix_unit_symbol = EXCLUDED.suffix_unit_symbol,
    minimum_fraction_digits = EXCLUDED.minimum_fraction_digits,
    maximum_fraction_digits = EXCLUDED.maximum_fraction_digits,
    thousand_separator = EXCLUDED.thousand_separator,
    shorten = EXCLUDED.shorten,
    description = EXCLUDED.description,
    example = EXCLUDED.example,
    display_order = EXCLUDED.display_order,
    category = EXCLUDED.category,
    updated_at = CURRENT_TIMESTAMP;

