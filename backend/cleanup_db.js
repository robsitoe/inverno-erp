const { Client } = require('pg');

async function cleanupDb(dbName) {
    const client = new Client({
        connectionString: 'postgresql://postgres:wisQP7@localhost:5432/' + dbName
    });

    try {
        await client.connect();
        console.log(`\n--- [${dbName}] Database cleanup starting ---`);

        // 1. Delete duplicates for FA 2026/3
        console.log('1. Checking for duplicates for "FA 2026/3"...');
        const duplicates = await client.query(`
            SELECT id, description, "createdAt"
            FROM journal_entries 
            WHERE reference = 'FA 2026/3' AND NOT description LIKE 'CMV%'
            ORDER BY "createdAt" ASC
        `);

        if (duplicates.rows.length > 1) {
            console.log(`   Found ${duplicates.rows.length} entries. Keeping the first one (${duplicates.rows[0].id}).`);
            for (let i = 1; i < duplicates.rows.length; i++) {
                const dupId = duplicates.rows[i].id;
                console.log(`   Removing extra entry ${dupId}...`);
                await client.query('DELETE FROM journal_lines WHERE "journalEntryId" = $1', [dupId]);
                await client.query('DELETE FROM journal_entries WHERE id = $1', [dupId]);
            }
            console.log('   ✅ Duplicates removed.');
        } else {
            console.log('   ℹ️ No duplicates found for this reference.');
        }

        // 2. Reset balances
        console.log('2. Resetting account balances to zero...');
        await client.query('UPDATE accounts SET balance = 0');

        // 3. Fetch all posted movements
        console.log('3. Recalculating balances from posted entries...');
        const query = `
            SELECT jl.debit, jl.credit, jl."accountId", acc.type, acc.id as acc_id
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

            let currentId = row.acc_id;
            while (currentId) {
                await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [delta, currentId]);
                const parentRes = await client.query('SELECT "parentId" FROM accounts WHERE id = $1', [currentId]);
                currentId = parentRes.rows[0]?.parentId;
            }
        }

        console.log(`--- ✅ [${dbName}] Completed successfully ---`);
    } catch (err) {
        console.error(`❌ [${dbName}] Error:`, err.message);
    } finally {
        await client.end();
    }
}

async function main() {
    const dbs = ['inverno_erp_qqq', 'inverno_erp_gas_solution'];
    for (const db of dbs) {
        await cleanupDb(db);
    }
}

main();
