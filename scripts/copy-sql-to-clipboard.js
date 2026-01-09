#!/usr/bin/env node

/**
 * Copy SQL file contents to clipboard (Windows)
 * Usage: node scripts/copy-sql-to-clipboard.js database/DEPRECATE_BRANCHES_TABLE.sql
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node scripts/copy-sql-to-clipboard.js <sql-file-path>');
  process.exit(1);
}

const fullPath = path.resolve(process.cwd(), filePath);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ File not found: ${fullPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(fullPath, 'utf8');

try {
  // Windows clipboard command
  execSync(`echo ${JSON.stringify(sql)} | clip`, { shell: 'powershell.exe' });
  console.log('✅ SQL copied to clipboard!');
  console.log('📋 You can now paste it into Supabase Dashboard SQL Editor');
  console.log(`\n🔗 Dashboard: https://supabase.com/dashboard/project/xnpevheuniybnadyfjut`);
} catch (error) {
  console.error('❌ Failed to copy to clipboard');
  console.error('📄 SQL content:');
  console.log('\n' + '='.repeat(50));
  console.log(sql);
  console.log('='.repeat(50));
}

