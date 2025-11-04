// Script per creare un utente admin nel database
import bcrypt from 'bcrypt';
import pool from '../database/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminUser() {
    try {
        const email = 'matteodiliberto4@gmail.com';
        const password = 'Mammaketty74!';
        const name = 'Matteo Di Liberto';
        const area = 'IT';
        const role = 'IT'; // o 'Admin' se preferisci

        console.log('🔐 Creazione/aggiornamento utente...');
        console.log(`Email: ${email}`);
        console.log(`Nome: ${name}`);
        console.log(`Ruolo: ${role}`);
        console.log(`Area: ${area}`);
        console.log('');

        // Prima aggiorna il constraint del ruolo se necessario
        console.log('📝 Verifica constraint ruolo...');
        try {
            await pool.query(`
                ALTER TABLE users 
                DROP CONSTRAINT IF EXISTS users_role_check;
            `);
            await pool.query(`
                ALTER TABLE users 
                ADD CONSTRAINT users_role_check 
                CHECK (role IN ('Socio', 'Responsabile', 'Admin', 'Presidente', 'CDA', 'Tesoreria', 'Marketing', 'Commerciale', 'IT', 'Audit'));
            `);
            console.log('✅ Constraint ruolo aggiornato');
        } catch (err) {
            console.warn('⚠️  Errore aggiornamento constraint (potrebbe già essere corretto):', err.message);
        }

        // Verifica se colonne is_active e last_seen esistono
        try {
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;');
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NULL;');
            console.log('✅ Colonne is_active e last_seen verificate');
        } catch (err) {
            console.warn('⚠️  Errore verifica colonne:', err.message);
        }

        console.log('');

        // Verifica se l'utente esiste già
        const existingUser = await pool.query(
            'SELECT user_id, email, role, area, name FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            console.log('⚠️  Utente già esistente!');
            const currentUser = existingUser.rows[0];
            console.log('Dati attuali:', {
                id: currentUser.user_id,
                name: currentUser.name,
                email: currentUser.email,
                role: currentUser.role,
                area: currentUser.area
            });
            console.log('Aggiornamento password e dati...');
            
            // Hash nuova password
            const passwordHash = await bcrypt.hash(password, 10);
            
            // Aggiorna password e ruolo
            await pool.query(
                `UPDATE users 
                 SET password_hash = $1, role = $2, area = $3, name = $4, is_active = TRUE
                 WHERE email = $5`,
                [passwordHash, role, area, name, email]
            );
            
            console.log('✅ Password e dati utente aggiornati con successo!');
        } else {
            console.log('📝 Creazione nuovo utente...');
            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Inserisci nuovo utente
            const result = await pool.query(
                `INSERT INTO users (name, email, password_hash, area, role, is_active)
                 VALUES ($1, $2, $3, $4, $5, TRUE)
                 RETURNING user_id, name, email, area, role`,
                [name, email, passwordHash, area, role]
            );

            const user = result.rows[0];
            console.log('✅ Utente creato con successo!');
            console.log('Dettagli utente:', {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                area: user.area
            });
        }

        // Test login
        console.log('\n🧪 Test login...');
        const testUser = await pool.query(
            'SELECT user_id, name, email, password_hash, area, role FROM users WHERE email = $1',
            [email]
        );

        if (testUser.rows.length > 0) {
            const user = testUser.rows[0];
            const validPassword = await bcrypt.compare(password, user.password_hash);
            
            if (validPassword) {
                console.log('✅ Password verificata correttamente!');
                console.log('✅ Login dovrebbe funzionare!');
            } else {
                console.error('❌ ERRORE: Password non corrisponde!');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Errore:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

createAdminUser();

