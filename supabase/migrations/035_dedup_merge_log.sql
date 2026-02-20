-- Merge log table for deduplication tracking
CREATE TABLE IF NOT EXISTS merge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  master_id UUID NOT NULL,
  merged_ids UUID[] NOT NULL,
  merge_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_merge_log_team ON merge_log(team_id, created_at DESC);

-- RLS
ALTER TABLE merge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read merge logs"
  ON merge_log FOR SELECT
  USING (team_id = (current_setting('app.current_team_id', true))::uuid);

CREATE POLICY "System can insert merge logs"
  ON merge_log FOR INSERT
  WITH CHECK (true);
