-- Migration 056: purge_account() function for GDPR hard-delete
--
-- The natural delete (`DELETE FROM accounts WHERE id = X`) is unsafe because
-- the FKs on accounts.id are a mix of CASCADE / NO ACTION / SET NULL:
--   * Owner pointers like contacts.account_id, deals.account_id are CASCADE
--     (correct — if you own the row, deleting you deletes the row).
--   * Actor pointers like *.deleted_by, *.assigned_to, leads.lead_owner_account_id
--     are NO ACTION — a raw delete would fail with FK violation.
--   * goals.account_id is SET NULL and property_showings.account_id is
--     NO ACTION even though those columns are the row's primary owner —
--     a delete would either orphan rows or fail outright.
--
-- We don't change the FK definitions (other code relies on the current
-- semantics — e.g. "you can't accidentally lose a deal when a manager is
-- deactivated"). Instead this function does the right thing at delete time:
-- nullify actor pointers, hard-delete rows owned only by the subject,
-- then drop the account row and let CASCADE handle the rest.

BEGIN;

CREATE OR REPLACE FUNCTION purge_account(p_account_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Actor pointers: the user did something to the row but doesn't own it.
  -- Nullify so the row survives.
  UPDATE automations SET created_by = NULL WHERE created_by = p_account_id;
  UPDATE call_logs SET caller_account_id = NULL WHERE caller_account_id = p_account_id;
  UPDATE call_logs SET deleted_by = NULL WHERE deleted_by = p_account_id;
  UPDATE companies SET deleted_by = NULL WHERE deleted_by = p_account_id;
  UPDATE contacts SET deleted_by = NULL WHERE deleted_by = p_account_id;
  UPDATE contacts SET assigned_to = NULL WHERE assigned_to = p_account_id;
  UPDATE crm_notes SET deleted_by = NULL WHERE deleted_by = p_account_id;
  UPDATE crm_tasks SET deleted_by = NULL WHERE deleted_by = p_account_id;
  UPDATE crm_tasks SET assigned_to = NULL WHERE assigned_to = p_account_id;
  UPDATE deals SET deleted_by = NULL WHERE deleted_by = p_account_id;
  UPDATE deals SET assigned_to = NULL WHERE assigned_to = p_account_id;
  UPDATE leads SET deleted_by = NULL WHERE deleted_by = p_account_id;
  UPDATE leads SET assigned_to = NULL WHERE assigned_to = p_account_id;
  UPDATE leads SET lead_owner_account_id = NULL WHERE lead_owner_account_id = p_account_id;
  UPDATE property_showings SET agent_account_id = NULL WHERE agent_account_id = p_account_id;

  -- Owner pointers without a CASCADE rule: delete manually so the row goes
  -- away with the subject, not orphaned with NULL.
  DELETE FROM property_showings WHERE account_id = p_account_id;
  DELETE FROM goals WHERE account_id = p_account_id;

  -- Final blow. Cascades the rest of the (correctly-defined) FKs.
  DELETE FROM accounts WHERE id = p_account_id;
END;
$$;

COMMENT ON FUNCTION purge_account(UUID) IS
  'GDPR Art. 17 hard delete. Nullifies actor pointers, removes orphan-prone owner rows, then drops the account. Intended to be called by /api/cron/purge-deleted-accounts after the grace period expires.';

COMMIT;
