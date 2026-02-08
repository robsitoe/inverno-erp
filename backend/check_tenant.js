const { Client } = require('pg');

async function checkTenantDB() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'inverno_erp_gas_solution',
        password: 'wisQP7',
        port: 5432,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM document_types');
        console.log('Document Types:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkTenantDB();
