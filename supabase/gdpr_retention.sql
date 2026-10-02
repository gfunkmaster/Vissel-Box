-- ============================================================================
-- GDPR DATA RETENTION POLICY
-- Swedish Whistleblower Law (2021:890) Compliance
-- ============================================================================
-- 
-- LEGAL REQUIREMENT:
-- Reports must be deleted after the retention period has expired.
-- Swedish law recommends a maximum of 24 months (2 years) retention.
-- 
-- This script creates:
-- 1. The 'closed' status and 'closed_at' for completed investigations
-- 2. A pg_cron scheduled job for automatic hard deletion
-- 3. The gdpr_deletion_log audit table
--
-- ORDER: schema.sql already includes 'closed' and closed_at, so this script can
-- be run before or after it. The ALTERs below are guarded (DROP IF EXISTS and an
-- information_schema check), so they also work on a database created from the
-- older schema.sql that only allowed 'new', 'read' and 'archived'.
-- ============================================================================

-- Step 1: Add 'closed' status and closed_at timestamp to reports table
-- Run this ONCE to migrate existing schema
ALTER TABLE reports 
  DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE reports 
  ADD CONSTRAINT reports_status_check 
  CHECK (status IN ('new', 'read', 'archived', 'closed'));

-- Add closed_at column to track when investigation was completed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE reports ADD COLUMN closed_at timestamp with time zone;
  END IF;
END $$;

-- Create index for efficient retention queries
CREATE INDEX IF NOT EXISTS idx_reports_closed_at ON reports(closed_at) 
  WHERE closed_at IS NOT NULL;

-- ============================================================================
-- Step 2: Function to automatically delete old closed reports
-- ============================================================================

CREATE OR REPLACE FUNCTION gdpr_delete_expired_reports()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  retention_months INTEGER := 24; -- Swedish law: max 24 months
BEGIN
  -- Delete reports that:
  -- 1. Have status = 'closed'
  -- 2. Were closed more than 24 months ago
  DELETE FROM reports
  WHERE status = 'closed'
    AND closed_at IS NOT NULL
    AND closed_at < NOW() - INTERVAL '24 months';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log deletion for audit trail (without PII)
  INSERT INTO gdpr_deletion_log (deleted_at, report_count, retention_months)
  VALUES (NOW(), deleted_count, retention_months)
  ON CONFLICT DO NOTHING;
  
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- Step 3: Create audit log table for GDPR compliance documentation
-- ============================================================================

CREATE TABLE IF NOT EXISTS gdpr_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at timestamp with time zone NOT NULL DEFAULT NOW(),
  report_count integer NOT NULL,
  retention_months integer NOT NULL,
  notes text
);

-- RLS: Only system can insert, admins can view
ALTER TABLE gdpr_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert deletion logs" ON gdpr_deletion_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view deletion logs" ON gdpr_deletion_log
  FOR SELECT
  USING (true);

-- ============================================================================
-- Step 4: Schedule the deletion job using pg_cron
-- ============================================================================
-- 
-- IMPORTANT: pg_cron must be enabled in your Supabase project:
-- 1. Go to Database > Extensions
-- 2. Enable the "pg_cron" extension
-- 
-- Then run this to schedule the job:

-- Run daily at 3:00 AM UTC
SELECT cron.schedule(
  'gdpr-report-cleanup',           -- Job name
  '0 3 * * *',                     -- Cron expression: daily at 3 AM
  $$SELECT gdpr_delete_expired_reports()$$
);

-- ============================================================================
-- Step 5: Manual trigger function for immediate cleanup
-- ============================================================================

-- Function to close a report and start the retention timer
CREATE OR REPLACE FUNCTION close_report(report_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE reports
  SET 
    status = 'closed',
    closed_at = NOW()
  WHERE id = report_uuid;
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check scheduled jobs:
-- SELECT * FROM cron.job;

-- Check deletion history:
-- SELECT * FROM gdpr_deletion_log ORDER BY deleted_at DESC;

-- Check reports pending deletion (will be deleted in next run):
-- SELECT id, created_at, closed_at, 
--        closed_at + INTERVAL '24 months' as deletion_date
-- FROM reports 
-- WHERE status = 'closed' 
-- ORDER BY closed_at;

-- Manual immediate deletion (emergency):
-- SELECT gdpr_delete_expired_reports();

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS gdpr_delete_expired_reports();
-- DROP FUNCTION IF EXISTS close_report(uuid);
-- DROP TABLE IF EXISTS gdpr_deletion_log;
-- SELECT cron.unschedule('gdpr-report-cleanup');
-- ALTER TABLE reports DROP COLUMN closed_at;
