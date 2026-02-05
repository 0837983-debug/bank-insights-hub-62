import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "bankdb",
  user: process.env.DB_USER || "pm",
  password: process.env.DB_PASSWORD || "2Lu125JK$CB#NCJak",
  ssl: {
    rejectUnauthorized: false,
  },
});

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface TableStructure {
  columns: ColumnInfo[];
  indexes: Array<{
    index_name: string;
    index_definition: string;
  }>;
}

async function getTableNames(): Promise<string[]> {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'config' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const result = await pool.query(query);
  return result.rows.map((row: any) => row.table_name);
}

async function getTableStructure(tableName: string): Promise<TableStructure> {
  // Get columns
  const columnsQuery = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'config' 
    AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  const columnsResult = await pool.query(columnsQuery, [tableName]);
  const columns: ColumnInfo[] = columnsResult.rows;

  // Get indexes
  const indexesQuery = `
    SELECT
      i.indexname as index_name,
      pg_get_indexdef(i.indexrelid) as index_definition
    FROM pg_indexes i
    WHERE i.schemaname = 'config' 
    AND i.tablename = $1;
  `;
  
  const indexesResult = await pool.query(indexesQuery, [tableName]);
  const indexes = indexesResult.rows.map((row: any) => ({
    index_name: row.index_name,
    index_definition: row.index_definition,
  }));

  return { columns, indexes };
}

async function getTableData(tableName: string): Promise<any[]> {
  // Escape table name to prevent SQL injection
  const escapedTableName = `"${tableName.replace(/"/g, '""')}"`;
  const query = `SELECT * FROM config.${escapedTableName} ORDER BY 1;`;
  const result = await pool.query(query);
  return result.rows;
}

function convertRowToJSON(row: any): any {
  const jsonRow: any = {};
  for (const [key, value] of Object.entries(row)) {
    // Handle Date objects
    if (value instanceof Date) {
      jsonRow[key] = value.toISOString();
    }
    // Handle arrays (like TEXT[])
    else if (Array.isArray(value)) {
      jsonRow[key] = value;
    }
    // Handle JSONB fields
    else if (value !== null && typeof value === 'object') {
      jsonRow[key] = value;
    }
    // Handle null
    else if (value === null) {
      jsonRow[key] = null;
    }
    // Handle Buffer (for bytea)
    else if (Buffer.isBuffer(value)) {
      jsonRow[key] = value.toString('base64');
    }
    // Handle other types
    else {
      jsonRow[key] = value;
    }
  }
  return jsonRow;
}

async function exportTableToJSON(tableName: string, outputDir: string): Promise<void> {
  console.log(`Exporting table: ${tableName}...`);
  
  try {
    // Get table structure
    const structure = await getTableStructure(tableName);
    
    // Get table data
    const data = await getTableData(tableName);
    
    // Convert rows to JSON format
    const jsonData = data.map(row => convertRowToJSON(row));
    
    // Create output object with structure and data
    const output = {
      table_name: tableName,
      schema: "config",
      structure: {
        columns: structure.columns.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          max_length: col.character_maximum_length,
          precision: col.numeric_precision,
          scale: col.numeric_scale,
        })),
        indexes: structure.indexes,
      },
      data: jsonData,
      row_count: jsonData.length,
      exported_at: new Date().toISOString(),
    };
    
    // Write to file
    const fileName = `${tableName}.json`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
    
    console.log(`✓ Exported ${jsonData.length} rows to ${fileName}`);
  } catch (error: any) {
    console.error(`✗ Error exporting ${tableName}:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log("Connecting to database...");
    await pool.query("SELECT 1");
    console.log("✓ Connected to database\n");

    // Get all tables in config schema
    console.log("Fetching tables from config schema...");
    const tableNames = await getTableNames();
    console.log(`Found ${tableNames.length} tables: ${tableNames.join(", ")}\n`);

    // Create output directory in project root
    const projectRoot = path.resolve(__dirname, "../../../../");
    const outputDir = path.join(projectRoot, "config-mockups");
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}\n`);
    } else {
      console.log(`Using existing output directory: ${outputDir}\n`);
    }

    // Export each table
    for (const tableName of tableNames) {
      await exportTableToJSON(tableName, outputDir);
    }

    console.log(`\n✓ Successfully exported ${tableNames.length} tables to ${outputDir}`);
    
  } catch (error: any) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
