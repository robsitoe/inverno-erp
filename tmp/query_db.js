const { Client } = require('pg');

async function runQuery(dbName, query) {
    const client = new Client({
        connectionString: `postgresql://postgres:wisQP7@localhost:5432/${dbName}`
    });
    try {
        await client.connect();
        const res = await client.query(query);
        console.log(`\n--- [${dbName}] Results ---`);
        console.table(res.rows);
    } catch (err) {
        console.error(`❌ [${dbName}] Error:`, err.message);
    } finally {
        await client.end();
    }
}

async function main() {
    const targetDb = process.argv[2] || 'inverno_erp';
    const query = process.argv[3] || 'SELECT id, name FROM companies';
    await runQuery(targetDb, query);
}

main();
