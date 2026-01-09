#!/bin/bash

# SQL Execution Script for Supabase (using psql)
# 
# Usage:
#   ./scripts/run-sql.sh "SELECT * FROM business_locations LIMIT 5;"
#   ./scripts/run-sql.sh --file database/DEPRECATE_BRANCHES_TABLE.sql

CONNECTION_STRING="postgresql://postgres:IPHONE@13MAX@db.xnpevheuniybnadyfjut.supabase.co:5432/postgres"

if [ "$1" == "--file" ] || [ "$1" == "-f" ]; then
    if [ -z "$2" ]; then
        echo "❌ Please provide a file path"
        exit 1
    fi
    
    if [ ! -f "$2" ]; then
        echo "❌ File not found: $2"
        exit 1
    fi
    
    echo "📄 Executing SQL from: $2"
    psql "$CONNECTION_STRING" -f "$2"
else
    if [ -z "$1" ]; then
        echo "Usage:"
        echo "  ./scripts/run-sql.sh \"SELECT * FROM table_name;\""
        echo "  ./scripts/run-sql.sh --file path/to/file.sql"
        exit 1
    fi
    
    echo "$1" | psql "$CONNECTION_STRING"
fi

