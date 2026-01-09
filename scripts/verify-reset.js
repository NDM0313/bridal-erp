const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.xnpevheuniybnadyfjut:khan313ndm313@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function verifyReset() {
    const pool = new Pool({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔍 Verifying Demo Account Reset...\n');
        const client = await pool.connect();
        
        // Check overall counts
        const countsResult = await client.query(`
            SELECT 
                b.name as business_name,
                (SELECT COUNT(*) FROM business_locations WHERE business_id = b.id AND deleted_at IS NULL) as branches,
                (SELECT COUNT(*) FROM products WHERE business_id = b.id) as products,
                (SELECT COUNT(*) FROM contacts WHERE business_id = b.id) as contacts,
                (SELECT COUNT(*) FROM transactions WHERE business_id = b.id AND type = 'sell') as sales,
                (SELECT COUNT(*) FROM transactions WHERE business_id = b.id AND type = 'purchase') as purchases,
                (SELECT COUNT(*) FROM variation_location_details vld 
                 JOIN business_locations bl ON bl.id = vld.location_id 
                 WHERE bl.business_id = b.id) as inventory
            FROM businesses b
            ORDER BY b.id
            LIMIT 1;
        `);
        
        console.log('📊 Demo Account Overview:');
        console.table(countsResult.rows);
        
        // Check branch-wise distribution
        const branchResult = await client.query(`
            SELECT 
                bl.name as branch_name,
                bl.custom_field1 as branch_code,
                COUNT(DISTINCT vld.id) as inventory_items,
                COALESCE(SUM(vld.qty_available), 0) as total_stock,
                COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'sell') as sales_count,
                COALESCE(SUM(t.final_total) FILTER (WHERE t.type = 'sell'), 0) as sales_revenue
            FROM business_locations bl
            LEFT JOIN variation_location_details vld ON vld.location_id = bl.id
            LEFT JOIN transactions t ON t.location_id = bl.id
            WHERE bl.business_id = (SELECT id FROM businesses ORDER BY id LIMIT 1)
            AND bl.deleted_at IS NULL
            GROUP BY bl.id, bl.name, bl.custom_field1
            ORDER BY bl.id;
        `);
        
        console.log('\n📍 Branch-wise Distribution:');
        console.table(branchResult.rows);
        
        // Check for NULL location_ids
        const nullCheck = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM transactions WHERE location_id IS NULL) as null_transactions,
                (SELECT COUNT(*) FROM variation_location_details WHERE location_id IS NULL) as null_inventory;
        `);
        
        console.log('\n✅ Data Quality Check:');
        const nullCounts = nullCheck.rows[0];
        if (nullCounts.null_transactions == 0 && nullCounts.null_inventory == 0) {
            console.log('✅ PASS: All records have valid location_id');
        } else {
            console.log(`❌ FAIL: ${nullCounts.null_transactions} transactions and ${nullCounts.null_inventory} inventory records have NULL location_id`);
        }
        
        // Check sample products
        const productsResult = await client.query(`
            SELECT name, sku, category_id
            FROM products
            WHERE business_id = (SELECT id FROM businesses ORDER BY id LIMIT 1)
            ORDER BY id
            LIMIT 5;
        `);
        
        console.log('\n📦 Sample Products:');
        console.table(productsResult.rows);
        
        // Recent sales
        const salesResult = await client.query(`
            SELECT 
                t.invoice_no,
                bl.name as branch,
                t.final_total,
                t.transaction_date::date as date
            FROM transactions t
            JOIN business_locations bl ON bl.id = t.location_id
            WHERE t.type = 'sell'
            AND t.business_id = (SELECT id FROM businesses ORDER BY id LIMIT 1)
            ORDER BY t.transaction_date DESC
            LIMIT 5;
        `);
        
        console.log('\n💰 Recent Sales:');
        console.table(salesResult.rows);
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ VERIFICATION COMPLETE');
        console.log('='.repeat(60));
        
        client.release();
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

verifyReset();
