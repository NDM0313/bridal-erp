const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xnpevheuniybnadyfjut:khan313ndm313@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function seedData() {
    const pool = new Pool({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔄 Connecting to database...');
        const client = await pool.connect();
        console.log('✅ Connected successfully');

        const sqlPath = path.join(__dirname, '..', 'database', 'RESET_AND_SEED_DEMO_DATA.sql');
        console.log(`📄 Reading SQL file: ${sqlPath}`);
        
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('🚀 Executing demo data reset and seed...');
        await client.query(sql);
        
        console.log('✅ Demo data seeding complete!');
        
        // Verification query
        console.log('\n📊 Verifying data counts...');
        const result = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM products) as products,
                (SELECT COUNT(*) FROM contacts) as contacts,
                (SELECT COUNT(*) FROM transactions WHERE type = 'sell') as sales,
                (SELECT COUNT(*) FROM transactions WHERE type = 'purchase') as purchases,
                (SELECT COUNT(*) FROM variation_location_details) as inventory,
                (SELECT COUNT(*) FROM business_locations WHERE deleted_at IS NULL) as branches;
        `);
        
        console.log('\n✅ Data Counts:');
        console.log(result.rows[0]);
        
        // Branch-wise breakdown
        const branchData = await client.query(`
            SELECT 
                bl.name as branch_name,
                bl.custom_field1 as branch_code,
                COUNT(DISTINCT vld.id) as inventory_items,
                COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'sell') as sales_count,
                COALESCE(SUM(t.final_total) FILTER (WHERE t.type = 'sell'), 0) as total_sales
            FROM business_locations bl
            LEFT JOIN variation_location_details vld ON vld.location_id = bl.id
            LEFT JOIN transactions t ON t.location_id = bl.id
            WHERE bl.deleted_at IS NULL
            GROUP BY bl.id, bl.name, bl.custom_field1
            ORDER BY bl.id;
        `);
        
        console.log('\n📍 Branch-wise Data:');
        console.table(branchData.rows);
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
    } finally {
        await pool.end();
    }
}

seedData();
