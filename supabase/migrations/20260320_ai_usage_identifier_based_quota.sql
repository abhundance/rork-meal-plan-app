-- Phase 2.5: make ai_usage work pre-auth
-- Identifier can be a user UUID (post-auth) or a hashed IP (pre-auth)

ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_user_id_fkey;
ALTER TABLE ai_usage ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS identifier text;
UPDATE ai_usage SET identifier = user_id::text WHERE user_id IS NOT NULL AND identifier IS NULL;
ALTER TABLE ai_usage ALTER COLUMN identifier SET NOT NULL;

ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_user_id_month_key;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_identifier_month_key UNIQUE (identifier, month);

CREATE INDEX IF NOT EXISTS idx_ai_usage_identifier_month ON ai_usage (identifier, month);
