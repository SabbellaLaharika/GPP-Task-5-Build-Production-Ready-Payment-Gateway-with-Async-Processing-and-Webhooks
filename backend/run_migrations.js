require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database');

        // Script is in root, looking for 'migrations' folder
        const migrationsDir = path.join(__dirname, 'migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.error('❌ Migrations directory not found:', migrationsDir);
            process.exit(1);
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Ensure order 001, 002, 003...

        if (files.length === 0) {
            console.log('No migration files found.');
            return;
        }

        console.log(`Found ${files.length} migration files in ${migrationsDir}`);

        for (const file of files) {
            console.log(`Running migration: ${file}...`);
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            try {
                await client.query('BEGIN'); // Start transaction for each file
                await client.query(sql);
                await client.query('COMMIT');
                console.log(`✅ Completed: ${file}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`❌ Failed to run ${file}:`, err.message);
                throw err;
            }
        }

        console.log('🎉 All migrations executed successfully');
    } catch (err) {
        console.error('❌ Migration process failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigrations();
