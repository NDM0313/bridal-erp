#!/bin/bash
# Secrets Audit Script
# Run before deployment to ensure no secrets are committed

echo "🔍 Auditing repository for secrets..."

# Check for service role keys
echo "Checking for service_role keys..."
if git grep -i "service_role" -- "*.js" "*.ts" "*.json" "*.md" 2>/dev/null | grep -v "example\|template\|documentation"; then
  echo "❌ ERROR: service_role key found in code!"
  exit 1
fi

# Check for anon keys (should only be in .env.example)
echo "Checking for anon keys..."
if git grep -i "sb_publishable" -- "*.js" "*.ts" "*.json" 2>/dev/null | grep -v "example\|template"; then
  echo "⚠️  WARNING: Anon key found in code (should only be in .env.example)"
fi

# Check for .env files
echo "Checking for .env files..."
if git ls-files | grep -E "\.env$|\.env\.local$|\.env\.production$"; then
  echo "❌ ERROR: .env files found in repository!"
  exit 1
fi

# Check for hardcoded URLs with keys
echo "Checking for hardcoded Supabase URLs with keys..."
if git grep -E "supabase\.co.*sb_" -- "*.js" "*.ts" 2>/dev/null; then
  echo "❌ ERROR: Hardcoded Supabase URL with key found!"
  exit 1
fi

echo "✅ No secrets found in code!"
exit 0

