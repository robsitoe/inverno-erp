const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres:wisQP7@localhost:5432/inverno_erp'
});

async function listCompanies() {
    try {
        await client.connect();
        const res = await client.query('SELECT id, name FROM company');
        console.log('Valid Companies in main database:');
        console.table(res.rows);
    } catch (err) {
        console.error('Error fetching companies:', err.message);
    } finally {
        await client.end();
    }
}

listCompanies();
