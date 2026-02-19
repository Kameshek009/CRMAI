-- Email Sequences: automated drip campaigns

CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  trigger_type TEXT DEFAULT 'manual', -- manual, on_create, on_stage_change
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sequences_team ON email_sequences(team_id);

CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  delay_days INTEGER NOT NULL DEFAULT 1,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sequence_steps_seq ON email_sequence_steps(sequence_id);

CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, completed, exited_reply
  current_step INTEGER DEFAULT 0,
  next_send_at TIMESTAMPTZ,
  enrolled_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_seq ON email_sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_next ON email_sequence_enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_enrollments_contact ON email_sequence_enrollments(contact_id);

CREATE TABLE IF NOT EXISTS email_sequence_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES email_sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES email_sequence_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, failed
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seq_sends_enrollment ON email_sequence_sends(enrollment_id);
