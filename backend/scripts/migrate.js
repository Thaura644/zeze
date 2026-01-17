#!/usr/bin/env node

/**
 * Database Migration Script for ZEZE Backend
 * This script handles database schema creation and migrations
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { query, pool } = require('../config/database');
const logger = require('../config/logger');

class MigrationManager {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.schemaPath = path.join(__dirname, 'schema.sql');
    this.seedPath = path.join(__dirname, 'seed.sql');
  }

  // Run all migrations
  async runMigrations() {
    try {
      logger.info('Starting database migrations...');

      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();

      // Read and apply schema
      await this.applySchema(executedMigrations);

      // Run any pending migration files
      await this.runPendingMigrations(executedMigrations);

      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed', { error: error.message });
      throw error;
    }
  }

  // Create migrations tracking table
  async createMigrationsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await query(createTableSQL);
    logger.info('Migrations table created/verified');
  }

  // Get list of already executed migrations
  async getExecutedMigrations() {
    const result = await query('SELECT name FROM migrations ORDER BY executed_at');
    return result.rows.map(row => row.name);
  }

  // Apply main schema
  async applySchema(executedMigrations) {
    if (executedMigrations.includes('schema')) {
      logger.info('Schema already applied, skipping');
      return;
    }

    try {
      const schemaSQL = await fs.readFile(this.schemaPath, 'utf8');
      
      // Split schema into individual statements
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      logger.info(`Applying ${statements.length} schema statements...`);

      // Execute each statement separately for better error handling
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            await query(statement);
            logger.debug(`Schema statement ${i + 1} executed successfully`);
          } catch (error) {
            // Log error but continue if it's about existing objects
            if (error.message.includes('already exists') || error.message.includes('does not exist')) {
              logger.debug(`Schema statement ${i + 1} skipped: ${error.message}`);
            } else {
              throw error;
            }
          }
        }
      }

      // Record schema migration
      await query('INSERT INTO migrations (name) VALUES ($1)', ['schema']);
      logger.info('Schema applied successfully');
    } catch (error) {
      logger.error('Failed to apply schema', { error: error.message });
      throw error;
    }
  }

  // Run pending migration files
  async runPendingMigrations(executedMigrations) {
    try {
      const migrationFiles = await fs.readdir(this.migrationsPath);
      const pendingMigrations = migrationFiles
        .filter(file => file.endsWith('.sql'))
        .filter(file => !executedMigrations.includes(path.basename(file, '.sql')))
        .sort(); // Sort to ensure consistent order

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations found');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      for (const file of pendingMigrations) {
        const migrationName = path.basename(file, '.sql');
        logger.info(`Running migration: ${migrationName}`);

        const migrationPath = path.join(this.migrationsPath, file);
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');

        try {
          await query(migrationSQL);
          await query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
          logger.info(`Migration ${migrationName} completed successfully`);
        } catch (error) {
          logger.error(`Migration ${migrationName} failed`, { error: error.message });
          throw error;
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No migrations directory found, skipping file-based migrations');
      } else {
        throw error;
      }
    }
  }

  // Seed database with sample data
  async seedDatabase() {
    try {
      logger.info('Starting database seeding...');

      // Check if data already exists
      const userCount = await query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) > 0) {
        logger.info('Database already contains data, skipping seeding');
        return;
      }

      const seedSQL = await fs.readFile(this.seedPath, 'utf8');
      const statements = seedSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      logger.info(`Applying ${statements.length} seed statements...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            await query(statement);
            logger.debug(`Seed statement ${i + 1} executed successfully`);
          } catch (error) {
            logger.error(`Seed statement ${i + 1} failed`, { error: error.message, statement: statement.substring(0, 100) });
            throw error;
          }
        }
      }

      logger.info('Database seeded successfully');
    } catch (error) {
      logger.error('Database seeding failed', { error: error.message });
      throw error;
    }
  }

  // Rollback migrations (for development/testing)
  async rollback(lastMigration = null) {
    try {
      logger.info('Starting migration rollback...');

      const executedMigrations = await this.getExecutedMigrations();
      
      let migrationsToRollback;
      if (lastMigration) {
        const index = executedMigrations.indexOf(lastMigration);
        if (index === -1) {
          throw new Error(`Migration ${lastMigration} not found`);
        }
        migrationsToRollback = executedMigrations.slice(index);
      } else {
        // Rollback the last migration
        migrationsToRollback = [executedMigrations[executedMigrations.length - 1]];
      }

      if (migrationsToRollback.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      for (const migration of migrationsToRollback) {
        logger.info(`Rolling back migration: ${migration}`);
        
        // Remove migration record
        await query('DELETE FROM migrations WHERE name = $1', [migration]);
        
        // For schema rollback, we would need specific rollback scripts
        // For now, just remove the migration record
        logger.info(`Migration ${migration} rolled back`);
      }

      logger.info('Migration rollback completed');
    } catch (error) {
      logger.error('Migration rollback failed', { error: error.message });
      throw error;
    }
  }

  // Get current migration status
  async getStatus() {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      
      // Check if schema exists
      let schemaExists = false;
      try {
        await query('SELECT 1 FROM users LIMIT 1');
        schemaExists = true;
      } catch (error) {
        // Schema doesn't exist
      }

      const status = {
        schema_applied: schemaExists,
        executed_migrations: executedMigrations,
        migration_count: executedMigrations.length,
        last_migration: executedMigrations.length > 0 ? executedMigrations[executedMigrations.length - 1] : null,
        database: {
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'zeze_guitar',
          connected: true
        }
      };

      return status;
    } catch (error) {
      logger.error('Failed to get migration status', { error: error.message });
      throw error;
    }
  }

  // Close database connections
  async close() {
    await pool.end();
    logger.info('Database connections closed');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const migrationManager = new MigrationManager();

  try {
    switch (command) {
      case 'migrate':
        await migrationManager.runMigrations();
        break;
        
      case 'seed':
        await migrationManager.seedDatabase();
        break;
        
      case 'rollback':
        const lastMigration = args[1];
        await migrationManager.rollback(lastMigration);
        break;
        
      case 'status':
        const status = await migrationManager.getStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
        
      case 'reset':
        logger.info('Resetting database...');
        await migrationManager.runMigrations();
        await migrationManager.seedDatabase();
        logger.info('Database reset completed');
        break;
        
      default:
        console.log(`
Usage: node migrate.js [command]

Commands:
  migrate     - Run all pending migrations
  seed        - Seed database with sample data
  rollback    - Rollback last migration (or specify migration name)
  status      - Show current migration status
  reset       - Run migrations and seed database

Examples:
  node migrate.js migrate
  node migrate.js seed
  node migrate.js rollback
  node migrate.js status
  node migrate.js reset
        `);
        process.exit(1);
    }
  } catch (error) {
    logger.error('Migration script failed', { error: error.message });
    process.exit(1);
  } finally {
    await migrationManager.close();
  }
}

// Run script if called directly
if (require.main === module) {
  main();
}

module.exports = MigrationManager;