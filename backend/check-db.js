const { Client } = require('pg');

async function checkDb() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'wisQP7',
        database: 'inverno_erp_gas_solution'
    });

    try {
        await client.connect();
        console.log('\n--- Columns of document_types ---');
        const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'document_types'");
        console.log(cols.rows);

        console.log('\n--- Sample data (first row) ---');
        const data = await client.query("SELECT * FROM document_types LIMIT 1");
        console.log(JSON.stringify(data.rows[0], null, 2));

        await client.end();
    } catch (err) {
        console.error('Error during DB check:', err.message);
    }
}

checkDb();
