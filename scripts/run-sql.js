#!/usr/bin/env node

/**
 * SQL Execution Script for Supabase
 * 
 * Usage:
 *   node scripts/run-sql.js "SELECT * FROM business_locations LIMIT 5;"
 *   node scripts/run-sql.js --file database/DEPRECATE_BRANCHES_TABLE.sql
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Database connection string
const CONNECTION_STRING = 'postgresql://postgres:IPHONE@13MAX@db.xnpevheuniybnadyfjut.supabase.co:5432/postgres';

async function executeSQL(sql) {
  // Parse connection string and use postgres package
  const sqlClient = postgres({
    host: 'db.xnpevheuniybnadyfjut.supabase.co',
    port: 5432,
    database: 'postgres',
    username: 'postgres',
    password: 'IPHONE@13MAX',
    ssl: 'require'
  });

  try {
    console.log('✅ Connected to Supabase database\n');
    console.log('📝 Executing SQL...\n');

    // Execute SQL
    const result = await sqlClient.unsafe(sql);

    // Display results
    if (Array.isArray(result) && result.length > 0) {
      console.log(`📊 Results (${result.length} rows):`);
      console.table(result);
    } else {
      console.log('✅ Query executed successfully (no rows returned)');
    }

    return result;
  } catch (error) {
    console.error('❌ Error executing SQL:');
    console.error(error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage:');
  console.error('  node scripts/run-sql.js "SELECT * FROM table_name;"');
  console.error('  node scripts/run-sql.js --file path/to/file.sql');
  process.exit(1);
}

if (args[0] === '--file' || args[0] === '-f') {
  // Read SQL from file
  const filePath = args[1];
  if (!filePath) {
    console.error('❌ Please provide a file path');
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`📄 Executing SQL from: ${filePath}\n`);
  executeSQL(sql);
} else {
  // Execute SQL from command line
  const sql = args.join(' ');
  executeSQL(sql);
}

