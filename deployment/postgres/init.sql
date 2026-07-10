-- TenantSense AI — PostgreSQL Setup Script
-- Creates the tenantsense user, database, and grants privileges

-- Create user (skip if already exists)
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tenantsense') THEN
      CREATE ROLE tenantsense LOGIN PASSWORD 'tenantsense_secure_pass';
   END IF;
END
$$;

-- Create database (owned by tenantsense)
SELECT 'CREATE DATABASE tenantsense_db OWNER tenantsense'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tenantsense_db')\gexec

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE tenantsense_db TO tenantsense;

-- Confirm
\echo '✅ tenantsense user and tenantsense_db database created successfully!'
