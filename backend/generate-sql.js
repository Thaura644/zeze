// Generate SQL commands for manual database setup
const fs = require('fs');
const path = require('path');

function generateSetupSQL() {
  const schemaPath = path.join(__dirname, 'database', 'schema.sql');

  try {
    // Read the schema file
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Split into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('📋 Database Setup SQL Commands');
    console.log('=' .repeat(50));
    console.log('Copy and paste these commands into your Supabase SQL Editor:\n');

    statements.forEach((statement, index) => {
      if (statement.trim()) {
        console.log(`-- Statement ${index + 1}`);
        console.log(statement + ';');
        console.log('');
      }
    });

    console.log('✅ SQL commands generated successfully!');
    console.log('\n📝 Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the commands above');
    console.log('4. Run them to create the database tables');

  } catch (error) {
    console.error('❌ Failed to generate SQL:', error.message);
  }
}

generateSetupSQL();