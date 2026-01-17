const fs = require('fs').promises;
const path = require('path');
const { query } = require('../config/database');
const logger = require('../config/logger');

class DatabaseMigrator {
  constructor() {
    this.migrationsPath = path.join(__dirname, '..', 'database', 'migrations');
    this.schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    this.migrationsTable = 'schema_migrations';
  }

  async initialize() {
    try {
      // Create migrations tracking table if it doesn't exist
      await this.createMigrationsTable();

      // Run initial schema if not already run
      await this.runInitialSchema();

      // Run any pending migrations
      await this.runPendingMigrations();

      logger.info('Database migration completed successfully');
    } catch (error) {
      logger.error('Database migration failed', { error: error.message });
      throw error;
    }
  }

  async createMigrationsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        migration_id VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT true,
        error_message TEXT
      );
    `;

    await query(createTableSQL);
    logger.info('Migrations tracking table created or already exists');
  }

  async runInitialSchema() {
    try {
      // Check if initial schema has been run
      const result = await query(
        `SELECT migration_id FROM ${this.migrationsTable} WHERE migration_id = 'initial_schema'`
      );

      if (result.rows.length > 0) {
        logger.info('Initial schema already applied');
        return;
      }

      // Read and execute initial schema
      const schemaSQL = await fs.readFile(this.schemaPath, 'utf8');

      // Split by semicolon and execute each statement
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          await query(statement);
        }
      }

      // Mark initial schema as executed
      await query(
        `INSERT INTO ${this.migrationsTable} (migration_id) VALUES ('initial_schema')`
      );

      logger.info('Initial schema applied successfully');
    } catch (error) {
      logger.error('Failed to apply initial schema', { error: error.message });
      throw error;
    }
  }

  async runPendingMigrations() {
    try {
      // Get list of migration files
      const migrationFiles = await fs.readdir(this.migrationsPath);
      const sqlFiles = migrationFiles
        .filter(file => file.endsWith('.sql'))
        .sort(); // Sort to ensure consistent order

      for (const file of sqlFiles) {
        const migrationId = path.parse(file).name;

        // Check if migration has been executed
        const result = await query(
          `SELECT migration_id FROM ${this.migrationsTable} WHERE migration_id = $1`,
          [migrationId]
        );

        if (result.rows.length > 0) {
          logger.info(`Migration ${migrationId} already executed, skipping`);
          continue;
        }

        // Execute migration
        const filePath = path.join(this.migrationsPath, file);
        const migrationSQL = await fs.readFile(filePath, 'utf8');

        try {
          await query(migrationSQL);
          await query(
            `INSERT INTO ${this.migrationsTable} (migration_id) VALUES ($1)`,
            [migrationId]
          );
          logger.info(`Migration ${migrationId} executed successfully`);
        } catch (migrationError) {
          // Mark migration as failed
          await query(
            `INSERT INTO ${this.migrationsTable} (migration_id, success, error_message) VALUES ($1, $2, $3)`,
            [migrationId, false, migrationError.message]
          );
          logger.error(`Migration ${migrationId} failed`, { error: migrationError.message });
          throw migrationError;
        }
      }
    } catch (error) {
      logger.error('Failed to run pending migrations', { error: error.message });
      throw error;
    }
  }

  async getMigrationStatus() {
    try {
      const result = await query(
        `SELECT migration_id, executed_at, success, error_message
         FROM ${this.migrationsTable}
         ORDER BY executed_at DESC`
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get migration status', { error: error.message });
      return [];
    }
  }
}

module.exports = new DatabaseMigrator();