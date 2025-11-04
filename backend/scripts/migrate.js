import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../database/connection.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    try {
        console.log('🔄 Avvio migrazione database...');

        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Esegui lo schema
        await pool.query(schema);

        console.log('✅ Migrazione completata con successo!');
        console.log('📊 Database inizializzato con tutte le tabelle.');

        // Crea un utente admin di default (opzionale)
        const bcrypt = await import('bcrypt');
        const defaultEmail = 'admin@gestionale.it';
        const defaultPassword = 'admin123';

        // Verifica se esiste già
        const existingUser = await pool.query(
            'SELECT user_id FROM users WHERE email = $1',
            [defaultEmail]
        );

        if (existingUser.rows.length === 0) {
            const passwordHash = await bcrypt.default.hash(defaultPassword, 10);
            await pool.query(
                `INSERT INTO users (name, email, password_hash, role, area)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['Admin', defaultEmail, passwordHash, 'Admin', 'CDA']
            );
            console.log(`👤 Utente admin creato:`);
            console.log(`   Email: ${defaultEmail}`);
            console.log(`   Password: ${defaultPassword}`);
            console.log(`   ⚠️  Cambia la password dopo il primo login!`);
        } else {
            console.log('ℹ️  Utente admin già esistente.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Errore durante la migrazione:', error);
        process.exit(1);
    }
}

migrate();

