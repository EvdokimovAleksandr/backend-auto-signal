/**
 * Скрипт подготовки базы данных после восстановления из дампа
 * 
 * Запуск: node setup-database.js
 * 
 * Выполняет:
 * 1. Проверку и добавление PRIMARY KEY (если отсутствуют)
 * 2. Добавление UNIQUE constraints на user_id
 * 3. Настройку sequences для auto-increment полей id
 */

require('dotenv').config();
const { Client } = require('pg');

async function setupDatabase() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Подключение к БД успешно\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   ПОДГОТОВКА БАЗЫ ДАННЫХ ПОСЛЕ ВОССТАНОВЛЕНИЯ ИЗ ДАМПА');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // ═══════════════════════════════════════════════════════════
    // ШАГ 1: Проверка и добавление PRIMARY KEY
    // ═══════════════════════════════════════════════════════════
    console.log('📌 Шаг 1: Проверка PRIMARY KEY...\n');
    
    const primaryKeys = [
      { table: 'admin_users', column: 'id', constraint: 'admin_users_pkey' },
      { table: 'admins', column: 'id', constraint: 'admins_pkey' },
      { table: 'bot_settings', column: 'id', constraint: 'bot_settings_pkey' },
      { table: 'brands', column: 'id', constraint: 'brands_pkey' },
      { table: 'file_access_stats', column: 'id', constraint: 'file_access_stats_pkey' },
      { table: 'files', column: 'id', constraint: 'files_pkey' },
      { table: 'models', column: 'id', constraint: 'models_pkey' },
      { table: 'owner', column: 'user_id', constraint: 'owner_pkey' },
      { table: 'password', column: 'password', constraint: 'password_pkey' },
      { table: 'premium_users', column: 'id', constraint: 'premium_users_pkey' },
      { table: 'subscription_prices', column: 'id', constraint: 'subscription_prices_pkey' },
      { table: 'users', column: 'id', constraint: 'users_pkey' },
      { table: 'years', column: 'id', constraint: 'years_pkey' },
    ];
    
    let pkAdded = 0;
    for (const pk of primaryKeys) {
      try {
        const checkSql = `
          SELECT constraint_name FROM information_schema.table_constraints 
          WHERE table_name = '${pk.table}' AND constraint_type = 'PRIMARY KEY'
        `;
        const existing = await client.query(checkSql);
        
        if (existing.rows.length > 0) {
          console.log(`  ✓ ${pk.table}: PRIMARY KEY существует`);
        } else {
          const sql = `ALTER TABLE ONLY public.${pk.table} ADD CONSTRAINT ${pk.constraint} PRIMARY KEY (${pk.column});`;
          await client.query(sql);
          console.log(`  ✅ ${pk.table}: PRIMARY KEY добавлен`);
          pkAdded++;
        }
      } catch (error) {
        if (error.message.includes('duplicate key')) {
          console.log(`  ⚠️  ${pk.table}: дубликаты в колонке ${pk.column} - требуется очистка`);
        } else {
          console.log(`  ❌ ${pk.table}: ${error.message}`);
        }
      }
    }
    console.log(`\n  Добавлено PRIMARY KEY: ${pkAdded}\n`);
    
    // ═══════════════════════════════════════════════════════════
    // ШАГ 2: Добавление UNIQUE constraints
    // ═══════════════════════════════════════════════════════════
    console.log('📌 Шаг 2: Добавление UNIQUE constraints...\n');
    
    const uniqueConstraints = [
      { table: 'users', column: 'user_id', name: 'users_user_id_key' },
      { table: 'premium_users', column: 'user_id', name: 'premium_users_user_id_key' },
      { table: 'admin_users', column: 'user_id', name: 'admin_users_user_id_key' },
      { table: 'bot_settings', column: 'setting_key', name: 'bot_settings_setting_key_key' },
      { table: 'subscription_prices', column: 'period_months', name: 'subscription_prices_period_months_key' },
    ];
    
    let uniqueAdded = 0;
    for (const c of uniqueConstraints) {
      try {
        const checkSql = `
          SELECT constraint_name FROM information_schema.table_constraints 
          WHERE table_name = '${c.table}' AND constraint_name = '${c.name}'
        `;
        const existing = await client.query(checkSql);
        
        if (existing.rows.length > 0) {
          console.log(`  ✓ ${c.table}.${c.column}: UNIQUE существует`);
        } else {
          const sql = `ALTER TABLE ${c.table} ADD CONSTRAINT ${c.name} UNIQUE (${c.column});`;
          await client.query(sql);
          console.log(`  ✅ ${c.table}.${c.column}: UNIQUE добавлен`);
          uniqueAdded++;
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ✓ ${c.table}.${c.column}: UNIQUE уже существует`);
        } else {
          console.log(`  ❌ ${c.table}.${c.column}: ${error.message}`);
        }
      }
    }
    console.log(`\n  Добавлено UNIQUE: ${uniqueAdded}\n`);
    
    // ═══════════════════════════════════════════════════════════
    // ШАГ 3: Настройка sequences для auto-increment
    // ═══════════════════════════════════════════════════════════
    console.log('📌 Шаг 3: Настройка sequences...\n');
    
    const sequences = [
      { table: 'admin_users', seq: 'admin_users_id_seq' },
      { table: 'admins', seq: 'admins_id_seq' },
      { table: 'bot_settings', seq: 'bot_settings_id_seq' },
      { table: 'brands', seq: 'brands_brand_id_seq' },
      { table: 'file_access_stats', seq: 'file_access_stats_id_seq' },
      { table: 'files', seq: 'files_id_seq' },
      { table: 'models', seq: 'models_id_seq' },
      { table: 'premium_users', seq: 'premium_users_id_seq' },
      { table: 'subscription_prices', seq: 'subscription_prices_id_seq' },
      { table: 'users', seq: 'users_id_seq' },
      { table: 'years', seq: 'years_id_seq' },
    ];
    
    let seqConfigured = 0;
    for (const t of sequences) {
      try {
        // Проверяем существование sequence
        const seqCheck = await client.query(`
          SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = $1
        `, [t.seq]);
        
        if (seqCheck.rows.length === 0) {
          await client.query(`CREATE SEQUENCE IF NOT EXISTS ${t.seq}`);
          console.log(`  📝 ${t.table}: создан sequence ${t.seq}`);
        }
        
        // Устанавливаем DEFAULT для столбца id
        await client.query(`ALTER TABLE ${t.table} ALTER COLUMN id SET DEFAULT nextval('${t.seq}')`);
        
        // Устанавливаем правильное значение sequence
        const maxResult = await client.query(`SELECT COALESCE(MAX(id), 0) + 1 as next_val FROM ${t.table}`);
        const nextVal = maxResult.rows[0].next_val;
        await client.query(`SELECT setval('${t.seq}', $1, false)`, [nextVal]);
        
        console.log(`  ✅ ${t.table}: sequence настроен (next = ${nextVal})`);
        seqConfigured++;
      } catch (error) {
        console.log(`  ❌ ${t.table}: ${error.message}`);
      }
    }
    console.log(`\n  Настроено sequences: ${seqConfigured}\n`);
    
    // ═══════════════════════════════════════════════════════════
    // ИТОГ
    // ═══════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ПОДГОТОВКА БАЗЫ ДАННЫХ ЗАВЕРШЕНА');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 Следующие шаги:');
    console.log('   1. npx prisma generate');
    console.log('   2. npm run check-db');
    console.log('   3. npm run dev\n');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  } finally {
    await client.end();
  }
}

setupDatabase();

