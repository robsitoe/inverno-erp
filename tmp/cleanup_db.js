const { Client } = require('pg');
const db = 'inverno_erp_qqq';

async function run() {
    const client = new Client({
        connectionString: 'postgresql://postgres:wisQP7@localhost:5432/' + db
    });

    try {
        await client.connect();
        console.log('--- Database cleanup starting ---');

        // 1. Delete duplicate entry
        console.log('1. Checking for duplicate JE8...');
        const check = await client.query("SELECT id FROM journal_entries WHERE id = 'JE8'");
        if (check.rows.length > 0) {
            console.log('   Removing JE8 lines...');
            await client.query('DELETE FROM journal_lines WHERE "journalEntryId" = \'JE8\'');
            console.log('   Removing JE8 entry...');
            await client.query('DELETE FROM journal_entries WHERE id = \'JE8\'');
            console.log('   ✅ JE8 removed.');
        } else {
            console.log('   ℹ️ JE8 not found, skipping removal.');
        }

        // 2. Reset balances
        console.log('2. Resetting account balances to zero...');
        await client.query('UPDATE accounts SET balance = 0');

        // 3. Fetch all posted movements
        console.log('3. Recalculating balances from posted entries...');
        const query = `
            SELECT jl.debit, jl.credit, jl."accountId", acc.type, acc.id as acc_id, acc.code
            FROM journal_entries je
            JOIN journal_lines jl ON je.id = jl."journalEntryId"
            JOIN accounts acc ON jl."accountId" = acc.id
            WHERE je.status = 'POSTED'
            ORDER BY je.date ASC, je.id ASC
        `;
        const res = await client.query(query);
        console.log(`   Processing ${res.rows.length} journal lines...`);

        for (const row of res.rows) {
            const isAsset = ['ASSET', 'EXPENSE', 'ATIVO', 'GASTO', 'CUSTO'].includes((row.type || '').toUpperCase());
            const delta = isAsset
                ? (Number(row.debit) - Number(row.credit))
                : (Number(row.credit) - Number(row.debit));

            // Update account and all its parents
            let currentId = row.acc_id;
            while (currentId) {
                await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [delta, currentId]);
                const parentRes = await client.query('SELECT "parentId" FROM accounts WHERE id = $1', [currentId]);
                currentId = parentRes.rows[0]?.parentId;
            }
        }

        console.log('--- ✅ Cleanup and recalculation completed successfully ---');
    } catch (err) {
        console.error('❌ Error during cleanup:', err.message);
    } finally {
        await client.end();
    }
}

run();
