-- ============================================================================
-- Migration 017: Migrate billing data from accounts to teams
-- ============================================================================

-- Copy billing data from each account to their owned team
UPDATE teams t SET
    tier = a.tier,
    stripe_customer_id = a.stripe_customer_id,
    stripe_subscription_id = a.stripe_subscription_id,
    token_limit = a.token_limit,
    tokens_used = a.tokens_used,
    weekly_tokens_used = a.weekly_tokens_used,
    week_start_date = a.week_start_date,
    billing_cycle_start = a.billing_cycle_start,
    seat_count = COALESCE((
        SELECT COUNT(*) FROM team_members tm
        WHERE tm.team_id = t.id AND tm.status = 'active'
    ), 1)
FROM accounts a
WHERE t.owner_account_id = a.id
  AND t.deleted_at IS NULL;

-- Link existing payment_history records to teams
UPDATE payment_history ph SET
    team_id = t.id
FROM accounts a
JOIN teams t ON t.owner_account_id = a.id AND t.deleted_at IS NULL
WHERE ph.account_id = a.id
  AND ph.team_id IS NULL;
