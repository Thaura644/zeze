const { query } = require('./config/database');
const logger = require('./config/logger');

async function checkDatabaseTables() {
  try {
    console.log('🔍 Checking database tables...\n');

    // Check if we can connect to the database
    const connectionTest = await query('SELECT 1 as test');
    console.log('✅ Database connection successful');

    // Check what tables exist
    const tablesResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Existing tables:');
    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found in database');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }

    // Check specifically for songs table
    const songsTableExists = tablesResult.rows.some(row => row.table_name === 'songs');
    if (songsTableExists) {
      console.log('✅ Songs table exists');

      // Check songs table structure
      const songsColumns = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'songs'
        ORDER BY ordinal_position
      `);

      console.log('📋 Songs table columns:');
      songsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
      });
    } else {
      console.log('❌ Songs table does not exist');
    }

    // Check for users table too
    const usersTableExists = tablesResult.rows.some(row => row.table_name === 'users');
    if (usersTableExists) {
      console.log('✅ Users table exists');
    } else {
      console.log('❌ Users table does not exist');
    }

  } catch (error) {
    console.log('❌ Database check failed!');
    console.log('Error:', error.message);
    console.log('Code:', error.code);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Connection issues:');
      console.log('- Database server may not be running');
      console.log('- Check DATABASE_URL configuration');
      console.log('- Verify Supabase instance is active');
    } else if (error.message.includes('authentication')) {
      console.log('\n🔧 Authentication issues:');
      console.log('- Check database credentials');
      console.log('- Verify DATABASE_URL format');
    }
  }
}

checkDatabaseTables().then(() => {
  console.log('\n✅ Database check completed');
}).catch((error) => {
  console.error('Database check failed:', error);
  process.exit(1);
});