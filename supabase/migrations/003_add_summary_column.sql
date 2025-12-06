-- Migration: 003_add_summary_column
-- Description: Add summary column for AI-generated summaries

ALTER TABLE recordings ADD COLUMN IF NOT EXISTS summary TEXT;
