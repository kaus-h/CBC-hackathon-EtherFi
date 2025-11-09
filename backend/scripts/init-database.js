/**
 * Database Initialization Script
 * Initializes the PostgreSQL database and creates all tables
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const db = require('../src/database/db-connection');
const logger = require('../src/utils/logger');

/**
 * Main initialization function
 */
async function initializeDatabase() {
    logger.info('========================================');
    logger.info('Database Initialization Starting...');
    logger.info('========================================');

    try {
        // Step 1: Test database connection
        logger.info('Step 1: Testing database connection...');
        const connectionSuccess = await db.testConnection();

        if (!connectionSuccess) {
            throw new Error('Database connection failed');
        }

        logger.success('Database connection successful!');

        // Step 2: Initialize schema
        logger.info('Step 2: Initializing database schema...');
        await db.initializeSchema();
        logger.success('Database schema initialized!');

        // Step 3: Verify tables
        logger.info('Step 3: Verifying database setup...');
        const pool = db.getPool();
        const client = await pool.connect();

        try {
            // Check tables
            const tablesResult = await client.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `);

            if (tablesResult.rows.length < 4) {
                throw new Error('Not all tables were created');
            }

            logger.success(`${tablesResult.rows.length} tables created successfully`);

            // Check views
            const viewsResult = await client.query(`
                SELECT table_name
                FROM information_schema.views
                WHERE table_schema = 'public'
                ORDER BY table_name
            `);

            logger.success(`${viewsResult.rows.length} views created successfully`);

            // Check test data
            const testDataResult = await client.query(`
                SELECT COUNT(*) as count
                FROM time_series_data
                WHERE data_source = 'schema_initialization'
            `);

            if (testDataResult.rows[0].count > 0) {
                logger.success('Test row verified successfully');
            }

            // Display summary
            logger.info('========================================');
            logger.success('Database Initialization Complete!');
            logger.info('========================================');
            logger.info('Database Details:');
            logger.info(`  Host: ${process.env.DB_HOST}`);
            logger.info(`  Port: ${process.env.DB_PORT}`);
            logger.info(`  Database: ${process.env.DB_NAME}`);
            logger.info(`  User: ${process.env.DB_USER}`);
            logger.info('');
            logger.info('Tables created:');
            tablesResult.rows.forEach(row => {
                logger.info(`  ✓ ${row.table_name}`);
            });
            logger.info('');
            logger.info('Views created:');
            viewsResult.rows.forEach(row => {
                logger.info(`  ✓ ${row.table_name}`);
            });
            logger.info('========================================');

        } finally {
            client.release();
        }

    } catch (error) {
        logger.error('Database initialization failed!', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    } finally {
        await db.closePool();
    }
}

// Run initialization
initializeDatabase();
