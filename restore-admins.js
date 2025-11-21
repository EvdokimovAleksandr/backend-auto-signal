require('dotenv').config();
const { Client } = require('pg');

async function restoreAdmins() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Восстанавливаем admin_users
    console.log('📦 Восстановление admin_users...');
    const adminUsers = [
      { id: 4, user_id: 5158383447, username: null, added_by: null, added_at: '2025-08-23 12:38:13.366401', is_super_admin: true },
      { id: 7, user_id: 1775844171, username: 'TatkaKam', added_by: 5158383447, added_at: '2025-08-26 11:58:16.761502', is_super_admin: false },
      { id: 8, user_id: 1092275236, username: 'Jdhuszbktdzkkexv', added_by: 5158383447, added_at: '2025-08-26 11:58:36.686377', is_super_admin: false },
      { id: 9, user_id: 1338641488, username: null, added_by: 5158383447, added_at: '2025-08-30 00:10:16.340894', is_super_admin: false },
    ];

    for (const admin of adminUsers) {
      try {
        await client.query(
          `INSERT INTO admin_users (id, user_id, username, added_by, added_at, is_super_admin) 
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
          [
            admin.id,
            BigInt(admin.user_id),
            admin.username,
            admin.added_by ? BigInt(admin.added_by) : null,
            admin.added_at,
            admin.is_super_admin
          ]
        );
        console.log(`   ✅ Admin user_id ${admin.user_id} восстановлен`);
      } catch (error) {
        if (error.message.includes('violates foreign key')) {
          console.log(`   ⚠️  Admin user_id ${admin.user_id} не найден в users`);
        } else {
          console.error(`   ❌ Ошибка для user_id ${admin.user_id}:`, error.message);
        }
      }
    }

    // Восстанавливаем premium_users
    console.log('\n📦 Восстановление premium_users...');
    const premiumUsers = [
      { id: 3, user_id: 5378516737, sub_start: '2025-07-25 23:46:03', sub_end: '2025-08-24 23:46:03', status: 'active', period_months: 1 },
    ];

    for (const premium of premiumUsers) {
      try {
        await client.query(
          `INSERT INTO premium_users (id, user_id, sub_end, period_months) 
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [
            premium.id,
            BigInt(premium.user_id),
            premium.sub_end,
            premium.period_months
          ]
        );
        console.log(`   ✅ Premium user_id ${premium.user_id} восстановлен`);
      } catch (error) {
        if (error.message.includes('violates foreign key')) {
          console.log(`   ⚠️  Premium user_id ${premium.user_id} не найден в users`);
        } else {
          console.error(`   ❌ Ошибка для user_id ${premium.user_id}:`, error.message);
        }
      }
    }

    console.log('\n✅ Готово!');
  } finally {
    await client.end();
  }
}

restoreAdmins().catch(console.error);

