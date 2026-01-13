import { pool } from "../../../config/database.js";

export interface Component {
  id: string;
  componentType: string;
  title: string | null;
  label: string | null;
  tooltip: string | null;
  icon: string | null;
  dataSourceKey: string | null;
  category: string | null;
  description: string | null;
}

export interface ComponentField {
  fieldId: string;
  label: string | null;
  fieldType: string;
  formatId: string | null;
  isVisible: boolean;
  displayOrder: number;
}

/**
 * Get component metadata by ID from config.components
 */
export async function getComponentById(componentId: string): Promise<Component | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        id,
        component_type,
        title,
        label,
        tooltip,
        icon,
        data_source_key,
        category,
        description
       FROM config.components
       WHERE id = $1
         AND is_active = TRUE
         AND deleted_at IS NULL`,
      [componentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      componentType: row.component_type,
      title: row.title,
      label: row.label,
      tooltip: row.tooltip,
      icon: row.icon,
      dataSourceKey: row.data_source_key,
      category: row.category,
      description: row.description,
    };
  } finally {
    client.release();
  }
}

/**
 * Get components by type
 */
export async function getComponentsByType(
  type: "card" | "table" | "chart"
): Promise<Component[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        id,
        component_type,
        title,
        label,
        tooltip,
        icon,
        data_source_key,
        category,
        description
       FROM config.components
       WHERE component_type = $1
         AND is_active = TRUE
         AND deleted_at IS NULL
       ORDER BY id`,
      [type]
    );

    return result.rows.map((row) => ({
      id: row.id,
      componentType: row.component_type,
      title: row.title,
      label: row.label,
      tooltip: row.tooltip,
      icon: row.icon,
      dataSourceKey: row.data_source_key,
      category: row.category,
      description: row.description,
    }));
  } finally {
    client.release();
  }
}

/**
 * Get component fields (columns) for a table component
 */
export async function getComponentFields(componentId: string): Promise<ComponentField[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        field_id,
        label,
        field_type,
        format_id,
        is_visible,
        display_order
       FROM config.component_fields
       WHERE component_id = $1
         AND is_active = TRUE
         AND deleted_at IS NULL
       ORDER BY display_order, id`,
      [componentId]
    );

    return result.rows.map((row) => ({
      fieldId: row.field_id,
      label: row.label,
      fieldType: row.field_type,
      formatId: row.format_id,
      isVisible: row.is_visible !== false,
      displayOrder: row.display_order || 0,
    }));
  } finally {
    client.release();
  }
}
