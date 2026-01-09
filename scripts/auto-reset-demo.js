const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xnpevheuniybnadyfjut:khan313ndm313@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function autoResetDemo() {
    const pool = new Pool({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔄 Connecting to database...');
        const client = await pool.connect();
        console.log('✅ Connected successfully\n');

        const sqlPath = path.join(__dirname, '..', 'database', 'AUTO_RESET_DEMO_ACCOUNT.sql');
        console.log(`📄 Reading SQL script: ${sqlPath}\n`);
        
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('🚀 Executing automatic demo account reset...\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const result = await client.query(sql);
        
        // Parse and display NOTICE messages from PostgreSQL
        client.on('notice', (msg) => {
            console.log(msg.message);
        });
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ AUTO-RESET COMPLETE!\n');
        
        // Quick verification
        console.log('📊 Quick Verification:\n');
        const verification = await client.query(`
            SELECT 
                b.name as business_name,
                (SELECT COUNT(*) FROM business_locations WHERE business_id = b.id AND deleted_at IS NULL) as branches,
                (SELECT COUNT(*) FROM products WHERE business_id = b.id) as products,
                (SELECT COUNT(*) FROM contacts WHERE business_id = b.id) as contacts,
                (SELECT COUNT(*) FROM transactions WHERE business_id = b.id AND type = 'sell') as sales,
                (SELECT COUNT(*) FROM variation_location_details vld 
                 JOIN business_locations bl ON bl.id = vld.location_id 
                 WHERE bl.business_id = b.id) as inventory
            FROM businesses b
            WHERE b.id = 1 OR b.name ILIKE '%studio%' OR b.name ILIKE '%rently%'
            ORDER BY b.id
            LIMIT 1;
        `);
        
        console.table(verification.rows);
        
        client.release();
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.detail) console.error('Detail:', error.detail);
        if (error.hint) console.error('Hint:', error.hint);
    } finally {
        await pool.end();
    }
}

autoResetDemo();
