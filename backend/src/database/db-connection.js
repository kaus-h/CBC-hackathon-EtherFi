/**
 * Database Connection Module
 * Handles PostgreSQL connection pooling and connection management
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection pool instance
let pool = null;

/**
 * Database configuration from environment variables
 */
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'etherfi_anomaly_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',

    // Connection pool settings
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum pool size
    min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum pool size
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
};

/**
 * Initialize database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
function initializePool() {
    if (pool) {
        return pool;
    }

    pool = new Pool(dbConfig);

    // Handle pool errors
    pool.on('error', (err, client) => {
        console.error('Unexpected error on idle database client:', err);
        process.exit(-1);
    });

    // Handle pool connection
    pool.on('connect', (client) => {
        console.log('New database client connected');
    });

    // Handle pool removal
    pool.on('remove', (client) => {
        console.log('Database client removed from pool');
    });

    console.log('Database connection pool initialized');
    console.log(`Database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    console.log(`Pool size: ${dbConfig.min}-${dbConfig.max} connections`);

    return pool;
}

/**
 * Get database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
function getPool() {
    if (!pool) {
        return initializePool();
    }
    return pool;
}

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
    try {
        const pool = getPool();
        const client = await pool.connect();

        console.log('Testing database connection...');

        // Run a simple query
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');

        console.log('Database connection successful!');
        console.log(`Server time: ${result.rows[0].current_time}`);
        console.log(`PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}`);

        // Test if tables exist
        const tablesResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        if (tablesResult.rows.length > 0) {
            console.log('Existing tables:');
            tablesResult.rows.forEach(row => {
                console.log(`  - ${row.table_name}`);
            });
        } else {
            console.log('No tables found. Schema needs to be initialized.');
        }

        client.release();
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error.message);
        return false;
    }
}

/**
 * Initialize database schema from SQL file
 * @returns {Promise<boolean>} True if successful
 */
async function initializeSchema() {
    try {
        const pool = getPool();
        const schemaPath = path.join(__dirname, 'schema.sql');

        console.log('Initializing database schema...');
        console.log(`Reading schema from: ${schemaPath}`);

        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at ${schemaPath}`);
        }

        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

        const client = await pool.connect();

        try {
            // Execute schema SQL
            await client.query(schemaSQL);
            console.log('Database schema initialized successfully!');

            // Verify tables were created
            const tablesResult = await client.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `);

            console.log('Created tables:');
            tablesResult.rows.forEach(row => {
                console.log(`  ✓ ${row.table_name}`);
            });

            // Verify the test row
            const testResult = await client.query(
                "SELECT * FROM time_series_data WHERE data_source = 'schema_initialization'"
            );

            if (testResult.rows.length > 0) {
                console.log('Test row verified successfully');
                return true;
            } else {
                console.warn('Warning: Test row not found');
                return false;
            }

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Schema initialization failed:', error.message);
        throw error;
    }
}

/**
 * Execute a query with error handling
 * @param {string} text SQL query text
 * @param {Array} params Query parameters
 * @returns {Promise<object>} Query result
 */
async function query(text, params = []) {
    const start = Date.now();
    try {
        const pool = getPool();
        const result = await pool.query(text, params);
        const duration = Date.now() - start;

        // Log slow queries (> 1 second)
        if (duration > 1000) {
            console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
        }

        return result;
    } catch (error) {
        console.error('Database query error:', error.message);
        console.error('Query:', text.substring(0, 200));
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<object>} Database client
 */
async function getClient() {
    const pool = getPool();
    return await pool.connect();
}

/**
 * Close database connection pool
 * @returns {Promise<void>}
 */
async function closePool() {
    if (pool) {
        console.log('Closing database connection pool...');
        await pool.end();
        pool = null;
        console.log('Database connection pool closed');
    }
}

/**
 * Health check for database
 * @returns {Promise<object>} Health status
 */
async function healthCheck() {
    try {
        const pool = getPool();
        const result = await pool.query('SELECT NOW()');

        return {
            status: 'healthy',
            timestamp: result.rows[0].now,
            totalConnections: pool.totalCount,
            idleConnections: pool.idleCount,
            waitingClients: pool.waitingCount
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, closing database connections...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, closing database connections...');
    await closePool();
    process.exit(0);
});

module.exports = {
    initializePool,
    getPool,
    testConnection,
    initializeSchema,
    query,
    getClient,
    closePool,
    healthCheck
};
