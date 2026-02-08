const { Client } = require('pg');

async function checkCompanies() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'inverno_erp',
        password: 'postgres',
        port: 5432,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM companies');
        console.log('Companies:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkCompanies();
