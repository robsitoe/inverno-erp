
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function dropUsersTable() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'wisQP7',
        database: 'inverno_erp',
    });

    try {
        await client.connect();
        console.log('Connected to DB. Dropping users table...');
        await client.query('DROP TABLE IF EXISTS "users" CASCADE');
        console.log('Table "users" dropped successfully.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

dropUsersTable();
