# Environment Variables Reference

Complete list of environment variables required for the backend.

## Required Variables

### Supabase Configuration

```env
# Supabase Project URL
# Get from: Supabase Dashboard → Settings → API → Project URL
SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase Anon Key (Public)
# Get from: Supabase Dashboard → Settings → API → Project API keys → anon public
# Safe to use in client-side code (with RLS enabled)
SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxx

# Supabase Service Role Key (Secret)
# Get from: Supabase Dashboard → Settings → API → Project API keys → service_role secret
# NEVER expose in client-side code - server-side only!
SUPABASE_SERVICE_ROLE_KEY=sb_xxxxxxxxxxxxx
```

## Optional Variables

### Server Configuration

```env
# Server Port
# Default: 3001
PORT=3001

# Node Environment
# Options: development, production, test
# Default: development
NODE_ENV=development
```

### CORS Configuration

```env
# CORS Origin
# Comma-separated list of allowed origins
# Default: http://localhost:3000
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

## Example .env File

```env
# Supabase
SUPABASE_URL=https://xnpevheuniybnadyfjut.supabase.co
SUPABASE_ANON_KEY=sb_publishable_Gl2zL4cEDTcOpv6VP9gFFA_GOSLUw-d
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Security Notes

1. **Never commit `.env` file** to version control
2. **Service Role Key** should never be exposed to clients
3. **Anon Key** is safe for client-side (with RLS enabled)
4. **Rotate keys** periodically in Supabase Dashboard

## Getting Your Credentials

1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

## Validation

The application will throw an error on startup if required variables are missing:

```
Error: Missing Supabase environment variables. Check .env file.
```

Make sure all required variables are set before starting the server.

