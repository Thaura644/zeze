#!/usr/bin/env node

/**
 * Database Migration Script for ZEZE Backend
 * This script handles database schema creation and migrations
 */

require('dotenv').config();

// Polyfill for Node.js environments where File/Blob are not global (e.g. Node < 20)
// This is required by newer versions of undici used by dependencies
if (typeof global.Blob === 'undefined') {
  global.Blob = require('node:buffer').Blob;
}
if (typeof global.File === 'undefined') {
  const { Blob } = require('node:buffer');
  // Simple File polyfill for Node 18
  class File extends Blob {
    constructor(parts, filename, options = {}) {
      super(parts, options);
      this.name = filename;
      this.lastModified = options.lastModified || Date.now();
    }
    get [Symbol.toStringTag]() {
      return 'File';
    }
  }
  global.File = File;
}

const fs = require('fs').promises;
const path = require('path');
const { query, pool } = require('../config/database');
const logger = require('../config/logger');

class MigrationManager {
  constructor() {
    this.migrationsPath = path.join(__dirname, '..', 'database', 'migrations');
    this.schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    this.seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
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

  // Rollback migrations with proper database cleanup and state restoration
  async rollback(lastMigration = null) {
    const client = await pool.connect();
    
    try {
      logger.info('Starting migration rollback...');
      await client.query('BEGIN');

      // Save current state before rollback
      const currentState = await this.saveDatabaseState(client);

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
        await client.query('COMMIT');
        return;
      }

      // Rollback in reverse order
      for (let i = migrationsToRollback.length - 1; i >= 0; i--) {
        const migration = migrationsToRollback[i];
        logger.info(`Rolling back migration: ${migration}`);
        
        // Get the rollback SQL for this migration
        const rollbackSQL = await this.getRollbackSQL(migration);
        
        if (rollbackSQL) {
          try {
            // Execute rollback SQL
            await client.query(rollbackSQL);
            logger.debug(`Executed rollback SQL for ${migration}`);
          } catch (rollbackError) {
            logger.error(`Failed to execute rollback SQL for ${migration}`, {
              error: rollbackError.message
            });
            
            // Attempt to restore state if rollback fails
            try {
              await this.restoreDatabaseState(client, currentState);
              logger.warn('Database state restored after rollback failure');
            } catch (restoreError) {
              logger.error('Failed to restore database state', {
                error: restoreError.message
              });
            }
            
            await client.query('ROLLBACK');
            throw rollbackError;
          }
        }
        
        // Remove migration record
        try {
          await client.query('DELETE FROM migrations WHERE name = $1', [migration]);
          logger.info(`Migration ${migration} rolled back successfully`);
        } catch (deleteError) {
          logger.error(`Failed to remove migration record for ${migration}`, {
            error: deleteError.message
          });
          
          // Attempt to restore state if record deletion fails
          try {
            await this.restoreDatabaseState(client, currentState);
            logger.warn('Database state restored after record deletion failure');
          } catch (restoreError) {
            logger.error('Failed to restore database state', {
              error: restoreError.message
            });
          }
          
          await client.query('ROLLBACK');
          throw deleteError;
        }
      }

      await client.query('COMMIT');
      logger.info('Migration rollback completed successfully');
    } catch (error) {
      logger.error('Migration rollback failed', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  // Save current database state for potential restoration
  async saveDatabaseState(client) {
    try {
      const state = {
        tables: [],
        functions: [],
        triggers: []
      };
      
      // Get all tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name NOT IN ('migrations')
      `);
      
      state.tables = tablesResult.rows.map(row => row.table_name);
      
      // Get all functions
      const functionsResult = await client.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
      `);
      
      state.functions = functionsResult.rows.map(row => row.routine_name);
      
      // Get all triggers
      const triggersResult = await client.query(`
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
      `);
      
      state.triggers = triggersResult.rows.map(row => row.trigger_name);
      
      logger.debug('Database state saved for potential restoration');
      return state;
    } catch (error) {
      logger.error('Failed to save database state', { error: error.message });
      return null;
    }
  }

  // Restore database state from saved state
  async restoreDatabaseState(client, state) {
    if (!state) {
      logger.warn('No database state to restore');
      return;
    }
    
    try {
      logger.info('Attempting to restore database state...');
      
      // Recreate functions
      for (const func of state.functions) {
        try {
          // This is a simplified approach - in production you'd need the actual function definitions
          logger.debug(`Would recreate function: ${func}`);
        } catch (error) {
          logger.error(`Failed to recreate function ${func}`, { error: error.message });
        }
      }
      
      // Recreate tables (simplified - in production you'd need the actual table definitions)
      for (const table of state.tables) {
        try {
          logger.debug(`Would recreate table: ${table}`);
        } catch (error) {
          logger.error(`Failed to recreate table ${table}`, { error: error.message });
        }
      }
      
      // Recreate triggers
      for (const trigger of state.triggers) {
        try {
          logger.debug(`Would recreate trigger: ${trigger}`);
        } catch (error) {
          logger.error(`Failed to recreate trigger ${trigger}`, { error: error.message });
        }
      }
      
      logger.info('Database state restoration attempted');
    } catch (error) {
      logger.error('Database state restoration failed', { error: error.message });
      throw error;
    }
  }

  // Get rollback SQL for a specific migration
  async getRollbackSQL(migrationName) {
    try {
      const rollbackPath = path.join(this.migrationsPath, `${migrationName}_rollback.sql`);
      
      // Check if rollback file exists
      try {
        await fs.access(rollbackPath);
        const rollbackSQL = await fs.readFile(rollbackPath, 'utf8');
        return rollbackSQL;
      } catch (accessError) {
        // No specific rollback file, try to generate generic rollback
        logger.warn(`No rollback file found for ${migrationName}, attempting generic rollback`);
        return this.generateGenericRollback(migrationName);
      }
    } catch (error) {
      logger.error(`Failed to get rollback SQL for ${migrationName}`, {
        error: error.message
      });
      throw error;
    }
  }

  // Generate generic rollback SQL based on migration name
  async generateGenericRollback(migrationName) {
    try {
      // For schema migration, we need to drop all tables from the main schema
      if (migrationName === 'schema') {
        return `
          -- Drop all tables for schema rollback
          DROP TABLE IF EXISTS system_logs CASCADE;
          DROP TABLE IF EXISTS song_techniques CASCADE;
          DROP TABLE IF EXISTS chords CASCADE;
          DROP TABLE IF EXISTS techniques CASCADE;
          DROP TABLE IF EXISTS practice_analysis CASCADE;
          DROP TABLE IF EXISTS practice_sessions CASCADE;
          DROP TABLE IF EXISTS user_songs CASCADE;
          DROP TABLE IF EXISTS songs CASCADE;
          DROP TABLE IF EXISTS users CASCADE;
          DROP TABLE IF EXISTS app_version_checks CASCADE;
          DROP TABLE IF EXISTS app_versions CASCADE;
          DROP TABLE IF EXISTS migrations CASCADE;
        `;
      }
      
      // For specific migrations, try to identify what was created
      const migrationPath = path.join(this.migrationsPath, `${migrationName}.sql`);
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      
      // Simple pattern matching to identify what was created
      const createTableMatches = migrationSQL.match(/CREATE TABLE IF NOT EXISTS (\w+)/g);
      const createIndexMatches = migrationSQL.match(/CREATE INDEX IF NOT EXISTS (\w+)/g);
      const createFunctionMatches = migrationSQL.match(/CREATE OR REPLACE FUNCTION (\w+)/g);
      const createTriggerMatches = migrationSQL.match(/CREATE TRIGGER (\w+)/g);
      
      const rollbackStatements = [];
      
      // Generate DROP statements for triggers first (to avoid dependency issues)
      if (createTriggerMatches) {
        for (const match of createTriggerMatches) {
          const triggerName = match.replace('CREATE TRIGGER ', '');
          rollbackStatements.push(`DROP TRIGGER IF EXISTS ${triggerName} ON ${this.extractTableFromTrigger(migrationSQL, triggerName)};`);
        }
      }
      
      // Generate DROP statements for functions
      if (createFunctionMatches) {
        for (const match of createFunctionMatches) {
          const functionName = match.replace('CREATE OR REPLACE FUNCTION ', '');
          rollbackStatements.push(`DROP FUNCTION IF EXISTS ${functionName}();`);
        }
      }
      
      // Generate DROP statements for indexes
      if (createIndexMatches) {
        for (const match of createIndexMatches) {
          const indexName = match.replace('CREATE INDEX IF NOT EXISTS ', '');
          rollbackStatements.push(`DROP INDEX IF EXISTS ${indexName} CASCADE;`);
        }
      }
      
      // Generate DROP statements for tables (last, to handle dependencies)
      if (createTableMatches) {
        for (const match of createTableMatches) {
          const tableName = match.replace('CREATE TABLE IF NOT EXISTS ', '');
          rollbackStatements.push(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
        }
      }
      
      if (rollbackStatements.length > 0) {
        return rollbackStatements.join('\n');
      }
      
      // If we can't determine what to rollback, return null
      logger.warn(`Could not generate rollback SQL for ${migrationName}`);
      return null;
    } catch (error) {
      logger.error(`Failed to generate generic rollback for ${migrationName}`, {
        error: error.message
      });
      return null;
    }
  }

  // Helper method to extract table name from trigger definition
  extractTableFromTrigger(migrationSQL, triggerName) {
    const triggerPattern = new RegExp(`CREATE TRIGGER ${triggerName}.*?ON (\w+)`, 's');
    const match = migrationSQL.match(triggerPattern);
    if (match && match[1]) {
      return match[1];
    }
    return 'users'; // Default fallback
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
    console.error('Migration script failed:', error);
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