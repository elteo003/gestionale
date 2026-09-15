/**
 * Esegue migration SQL incrementali registrate in schema_migrations.
 * Uso: npm run migrate:sql
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../database/connection.js';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '../database');

/** Ordine esplicito (non alfabetico). */
const MIGRATION_FILES = [
    'migration_000_shared_functions.sql',
    'migration_add_last_seen.sql',
    'migration_add_version_optimistic_locking.sql',
    'migration_tasks_and_assignments.sql',
    'migration_advanced_events.sql',
    'migration_event_reports_and_polls.sql',
    'migration_hr_recruiting.sql',
    'migration_poll_heatmap_mode.sql',
    'migration_roles_manager.sql',
    'migration_fix_polls_updated_at_triggers.sql',
    'migration_project_resources.sql',
    'migration_notifications_push.sql',
    'migration_message_citations.sql',
    'migration_message_mentions.sql',
];

async function ensureMigrationsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
}

async function isApplied(filename) {
    const r = await pool.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename],
    );
    return r.rows.length > 0;
}

async function markApplied(filename) {
    await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [filename],
    );
}

async function runMigration(filename) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Saltata (file assente): ${filename}`);
        return;
    }

    if (await isApplied(filename)) {
        console.log(`⏭️  Già applicata: ${filename}`);
        return;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [filename],
        );
        await client.query('COMMIT');
        console.log(`✅ Applicata: ${filename}`);
    } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`${filename}: ${err.message}`);
    } finally {
        client.release();
    }
}

async function main() {
    try {
        console.log('🔄 Migrazioni SQL incrementali...');
        await ensureMigrationsTable();

        for (const file of MIGRATION_FILES) {
            await runMigration(file);
        }

        console.log('✅ Migrazioni completate.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Errore migrazioni:', err.message);
        process.exit(1);
    }
}

main();
