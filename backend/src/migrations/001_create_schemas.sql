-- Create database schemas for Bank Insights Hub
-- This migration creates only schemas without tables

-- Security: users, roles, sessions, permissions
CREATE SCHEMA IF NOT EXISTS sec;

-- Configuration: metadata (table structures, formats, layout)
CREATE SCHEMA IF NOT EXISTS config;

-- Dictionaries: reference data (clients, accounts, types)
CREATE SCHEMA IF NOT EXISTS dict;

-- Staging: raw data layer (daily uploads, basic validation)
CREATE SCHEMA IF NOT EXISTS stg;

-- Operational Data Store: validated data with versioning
CREATE SCHEMA IF NOT EXISTS ods;

-- Data Mart: aggregated data for API consumption
CREATE SCHEMA IF NOT EXISTS mart;

-- Ingestion: data loading management (jobs, uploads, versions)
CREATE SCHEMA IF NOT EXISTS ing;

-- Logging: audit logs, auth attempts, API logs, errors
CREATE SCHEMA IF NOT EXISTS log;

-- Grant usage on schemas (adjust as needed for your user)
-- GRANT USAGE ON SCHEMA sec TO pm;
-- GRANT USAGE ON SCHEMA config TO pm;
-- GRANT USAGE ON SCHEMA dict TO pm;
-- GRANT USAGE ON SCHEMA stg TO pm;
-- GRANT USAGE ON SCHEMA ods TO pm;
-- GRANT USAGE ON SCHEMA mart TO pm;
-- GRANT USAGE ON SCHEMA ing TO pm;
-- GRANT USAGE ON SCHEMA log TO pm;

