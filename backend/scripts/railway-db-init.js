/**
 * Railway Database Initialization Script
 * Automatically sets up the database schema on Railway PostgreSQL
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function initializeDatabase() {
  console.log('🚀 Railway Database Initialization Starting...');

  // Connect to Railway PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to Railway PostgreSQL');

    // Read schema file
    const schemaPath = path.join(__dirname, '../src/database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    console.log('📋 Creating database tables...');
    await client.query(schema);
    console.log('✅ Database schema created successfully');

    // Check if we need to load historical data
    const checkData = await client.query('SELECT COUNT(*) FROM time_series_data');
    const recordCount = parseInt(checkData.rows[0].count);

    if (recordCount === 0) {
      console.log('📊 No historical data found. Database is ready for collectors to populate.');
      console.log('⚠️  Note: Historical data will be loaded by the collectors on first run.');
    } else {
      console.log(`✅ Database already has ${recordCount} records`);
    }

    client.release();
    await pool.end();

    console.log('🎉 Database initialization completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
