import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "bankdb",
  user: process.env.DB_USER || "pm",
  password: process.env.DB_PASSWORD || "2Lu125JK$CB#NCJak",
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

// Функция для получения последнего дня месяца
function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// Генерация дат для всех месяцев в периоде
function generateMonthDates(startDate, endDate) {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (current <= endMonth) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const lastDay = getLastDayOfMonth(year, month);
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    current.setMonth(current.getMonth() + 1);
  }
  
  return dates;
}

// Генерация тестовых данных для одного месяца
function generateMonthData(periodDate) {
  const baseValue = 1000000000; // Базовое значение
  const monthIndex = parseInt(periodDate.split('-')[1]) - 1;
  const yearIndex = parseInt(periodDate.split('-')[0]) - 2024;
  const multiplier = 1 + (yearIndex * 12 + monthIndex) * 0.02; // Небольшой рост каждый месяц
  
  return [
    // АКТИВЫ - Кредиты корпоративным клиентам
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-1-${periodDate.replace(/-/g, '')}`,
      period_date: periodDate,
      value: Math.round(4500000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_corporate',
      sub_balance_item: 'term',
      client_type: 'corporate',
      client_segment: 'corporate',
      product_code: 'CORP_LOAN_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-1-${periodDate.replace(/-/g, '')}-2`,
      period_date: periodDate,
      value: Math.round(5000000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_corporate',
      sub_balance_item: 'demand',
      client_type: 'corporate',
      client_segment: 'corporate',
      product_code: 'CORP_LOAN_002',
      currency_code: 'RUB',
      interest_type: 'floating'
    },
    // Розничные кредиты
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-2-${periodDate.replace(/-/g, '')}-1`,
      period_date: periodDate,
      value: Math.round(3500000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_retail',
      sub_balance_item: 'secured',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'RETAIL_LOAN_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-2-${periodDate.replace(/-/g, '')}-2`,
      period_date: periodDate,
      value: Math.round(2700000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_retail',
      sub_balance_item: 'unsecured',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'RETAIL_LOAN_002',
      currency_code: 'RUB',
      interest_type: 'floating'
    },
    // МСБ кредиты
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-1-${periodDate.replace(/-/g, '')}-3`,
      period_date: periodDate,
      value: Math.round(1800000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_sme',
      sub_balance_item: 'term',
      client_type: 'sme',
      client_segment: 'sme',
      product_code: 'SME_LOAN_001',
      currency_code: 'RUB',
      interest_type: 'mixed'
    },
    // Премиум сегмент
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-2-${periodDate.replace(/-/g, '')}-3`,
      period_date: periodDate,
      value: Math.round(1200000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_retail',
      sub_balance_item: 'premium',
      client_type: 'individual',
      client_segment: 'premium',
      product_code: 'PREMIUM_LOAN_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    // Ипотечные кредиты
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-2-${periodDate.replace(/-/g, '')}-4`,
      period_date: periodDate,
      value: Math.round(8500000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_mortgage',
      sub_balance_item: 'residential',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'MORTGAGE_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    // Автокредиты
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-2-${periodDate.replace(/-/g, '')}-5`,
      period_date: periodDate,
      value: Math.round(3200000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_auto',
      sub_balance_item: 'new_cars',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'AUTO_LOAN_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    // Кредиты в USD
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-1-${periodDate.replace(/-/g, '')}-4`,
      period_date: periodDate,
      value: Math.round(250000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_corporate',
      sub_balance_item: 'term',
      client_type: 'corporate',
      client_segment: 'corporate',
      product_code: 'CORP_LOAN_USD_001',
      currency_code: 'USD',
      interest_type: 'floating'
    },
    // Кредиты в EUR
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-1-${periodDate.replace(/-/g, '')}-5`,
      period_date: periodDate,
      value: Math.round(180000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_corporate',
      sub_balance_item: 'term',
      client_type: 'corporate',
      client_segment: 'corporate',
      product_code: 'CORP_LOAN_EUR_001',
      currency_code: 'EUR',
      interest_type: 'fixed'
    },
    
    // ПАССИВЫ - Депозиты
    // Срочные депозиты физлиц
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-1-${periodDate.replace(/-/g, '')}-1`,
      period_date: periodDate,
      value: Math.round(6800000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'term_deposits_retail',
      sub_balance_item: '1_year',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'TERM_DEPOSIT_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-1-${periodDate.replace(/-/g, '')}-2`,
      period_date: periodDate,
      value: Math.round(4400000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'term_deposits_retail',
      sub_balance_item: '6_months',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'TERM_DEPOSIT_002',
      currency_code: 'RUB',
      interest_type: 'floating'
    },
    // Срочные депозиты корпораций
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-2-${periodDate.replace(/-/g, '')}-1`,
      period_date: periodDate,
      value: Math.round(5200000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'term_deposits_corporate',
      sub_balance_item: '1_year',
      client_type: 'corporate',
      client_segment: 'corporate',
      product_code: 'CORP_DEPOSIT_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-2-${periodDate.replace(/-/g, '')}-2`,
      period_date: periodDate,
      value: Math.round(2600000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'term_deposits_corporate',
      sub_balance_item: '3_months',
      client_type: 'corporate',
      client_segment: 'corporate',
      product_code: 'CORP_DEPOSIT_002',
      currency_code: 'RUB',
      interest_type: 'floating'
    },
    // Накопительные счета
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-3-${periodDate.replace(/-/g, '')}-1`,
      period_date: periodDate,
      value: Math.round(2000000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'savings_accounts',
      sub_balance_item: 'standard',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'SAVINGS_001',
      currency_code: 'RUB',
      interest_type: 'mixed'
    },
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-3-${periodDate.replace(/-/g, '')}-2`,
      period_date: periodDate,
      value: Math.round(1500000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'savings_accounts',
      sub_balance_item: 'premium',
      client_type: 'individual',
      client_segment: 'premium',
      product_code: 'PREMIUM_SAVINGS_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    // Депозиты МСБ
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-2-${periodDate.replace(/-/g, '')}-3`,
      period_date: periodDate,
      value: Math.round(1200000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'term_deposits_sme',
      sub_balance_item: '6_months',
      client_type: 'sme',
      client_segment: 'sme',
      product_code: 'SME_DEPOSIT_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    // Депозиты в USD
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-1-${periodDate.replace(/-/g, '')}-3`,
      period_date: periodDate,
      value: Math.round(450000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'term_deposits_retail',
      sub_balance_item: '1_year',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'TERM_DEPOSIT_USD_001',
      currency_code: 'USD',
      interest_type: 'floating'
    },
    // Депозиты в EUR
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-2-${periodDate.replace(/-/g, '')}-4`,
      period_date: periodDate,
      value: Math.round(320000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'term_deposits_corporate',
      sub_balance_item: '1_year',
      client_type: 'corporate',
      client_segment: 'corporate',
      product_code: 'CORP_DEPOSIT_EUR_001',
      currency_code: 'EUR',
      interest_type: 'fixed'
    },
    // Дополнительные строки с различными комбинациями
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-1-${periodDate.replace(/-/g, '')}-6`,
      period_date: periodDate,
      value: Math.round(2200000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_corporate',
      sub_balance_item: null,
      client_type: 'corporate',
      client_segment: 'corporate',
      product_code: 'CORP_LOAN_003',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-2-${periodDate.replace(/-/g, '')}-6`,
      period_date: periodDate,
      value: Math.round(1500000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_retail',
      sub_balance_item: 'consumer',
      client_type: 'individual',
      client_segment: null,
      product_code: 'CONSUMER_LOAN_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    },
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-1-${periodDate.replace(/-/g, '')}-7`,
      period_date: periodDate,
      value: Math.round(1800000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_corporate',
      sub_balance_item: 'overdraft',
      client_type: 'corporate',
      client_segment: 'corporate',
      product_code: 'CORP_OVERDRAFT_001',
      currency_code: 'RUB',
      interest_type: null
    },
    {
      table_component_id: 'balance_assets_table',
      row_code: `a5-2-${periodDate.replace(/-/g, '')}-7`,
      period_date: periodDate,
      value: Math.round(2800000000 * multiplier),
      balance_class: 'assets',
      balance_section: 'loans',
      balance_item: 'loans_retail',
      sub_balance_item: 'credit_cards',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'CREDIT_CARD_001',
      currency_code: 'RUB',
      interest_type: 'floating'
    },
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-1-${periodDate.replace(/-/g, '')}-4`,
      period_date: periodDate,
      value: Math.round(3100000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'term_deposits_retail',
      sub_balance_item: null,
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'TERM_DEPOSIT_003',
      currency_code: 'RUB',
      interest_type: 'floating'
    },
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-3-${periodDate.replace(/-/g, '')}-3`,
      period_date: periodDate,
      value: Math.round(900000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'savings_accounts',
      sub_balance_item: 'online',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: null,
      currency_code: 'RUB',
      interest_type: 'mixed'
    },
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-2-${periodDate.replace(/-/g, '')}-5`,
      period_date: periodDate,
      value: Math.round(950000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'term_deposits_corporate',
      sub_balance_item: 'call',
      client_type: null,
      client_segment: 'corporate',
      product_code: 'CORP_DEPOSIT_003',
      currency_code: 'RUB',
      interest_type: 'floating'
    },
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-1-${periodDate.replace(/-/g, '')}-5`,
      period_date: periodDate,
      value: Math.round(2100000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'term_deposits_retail',
      sub_balance_item: 'flexible',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'FLEX_DEPOSIT_001',
      currency_code: 'RUB',
      interest_type: 'mixed'
    },
    {
      table_component_id: 'balance_liabilities_table',
      row_code: `l2-3-${periodDate.replace(/-/g, '')}-4`,
      period_date: periodDate,
      value: Math.round(1100000000 * multiplier),
      balance_class: 'liabilities',
      balance_section: 'deposits',
      balance_item: 'savings_accounts',
      sub_balance_item: 'youth',
      client_type: 'individual',
      client_segment: 'retail',
      product_code: 'YOUTH_SAVINGS_001',
      currency_code: 'RUB',
      interest_type: 'fixed'
    }
  ];
}

async function refreshBalanceData() {
  const client = await pool.connect();
  
  try {
    console.log("🔄 Обновление данных в mart.balance\n");
    
    // Удаляем все существующие данные
    console.log("1. Удаление всех данных из mart.balance...");
    await client.query('DELETE FROM mart.balance');
    console.log("   ✓ Данные удалены\n");
    
    // Генерируем даты для всех месяцев
    const dates = generateMonthDates('2024-12-01', '2026-01-01');
    console.log(`2. Генерация данных за ${dates.length} месяцев...`);
    console.log(`   Период: ${dates[0]} - ${dates[dates.length - 1]}\n`);
    
    // Генерируем данные для каждого месяца
    let totalRows = 0;
    for (const date of dates) {
      const monthData = generateMonthData(date);
      
      // Вставляем данные пакетами
      for (const row of monthData) {
        const query = `
          INSERT INTO mart.balance (
            table_component_id, row_code, period_date, value,
            balance_class, balance_section, balance_item, sub_balance_item,
            client_type, client_segment, product_code, currency_code, interest_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT DO NOTHING
        `;
        
        await client.query(query, [
          row.table_component_id,
          row.row_code,
          row.period_date,
          row.value,
          row.balance_class,
          row.balance_section,
          row.balance_item,
          row.sub_balance_item,
          row.client_type,
          row.client_segment,
          row.product_code,
          row.currency_code,
          row.interest_type
        ]);
      }
      
      totalRows += monthData.length;
      console.log(`   ✓ ${date}: добавлено ${monthData.length} строк`);
    }
    
    console.log(`\n3. Итого добавлено: ${totalRows} строк за ${dates.length} месяцев\n`);
    
    // Проверяем результат
    const countResult = await client.query('SELECT COUNT(*) as count FROM mart.balance');
    const dateRangeResult = await client.query(`
      SELECT 
        MIN(period_date) as min_date,
        MAX(period_date) as max_date,
        COUNT(DISTINCT period_date) as month_count
      FROM mart.balance
    `);
    
    console.log("📊 Статистика:");
    console.log(`   Всего строк: ${countResult.rows[0].count}`);
    console.log(`   Период: ${dateRangeResult.rows[0].min_date} - ${dateRangeResult.rows[0].max_date}`);
    console.log(`   Месяцев: ${dateRangeResult.rows[0].month_count}`);
    
    console.log("\n✅ Данные успешно обновлены!");
    
  } catch (error) {
    console.error("❌ Ошибка при обновлении данных:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

refreshBalanceData().catch(console.error);
