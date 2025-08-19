-- Initial database schema for orders/executions, PnL snapshots, and audit trail
-- This file runs automatically on first container init via /docker-entrypoint-initdb.d

BEGIN;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Orders placed through the system
CREATE TABLE IF NOT EXISTS orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_order_id   text,
  symbol            text NOT NULL,
  side              text NOT NULL CHECK (side IN ('buy','sell')),
  quantity          numeric(38,10) NOT NULL CHECK (quantity > 0),
  price             numeric(38,10),
  notional_usd      numeric(38,10),
  status            text NOT NULL CHECK (status IN (
                        'new','partially_filled','filled','canceled','rejected','expired'
                      )),
  exchange_order_id text,
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_symbol_status ON orders (symbol, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

-- Trade executions for each order
CREATE TABLE IF NOT EXISTS executions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  execution_id  text,
  trade_id      text,
  price         numeric(38,10) NOT NULL,
  quantity      numeric(38,10) NOT NULL,
  fee_currency  text,
  fee_amount    numeric(38,10),
  liquidity     text CHECK (liquidity IN ('maker','taker')),
  executed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exec_order_id ON executions (order_id);
CREATE INDEX IF NOT EXISTS idx_exec_executed_at ON executions (executed_at);

-- PnL snapshots for monitoring/reporting
CREATE TABLE IF NOT EXISTS pnl_snapshots (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at                   timestamptz NOT NULL DEFAULT now(),
  realized_pnl_usd     numeric(38,10) NOT NULL DEFAULT 0,
  unrealized_pnl_usd   numeric(38,10) NOT NULL DEFAULT 0,
  equity_usd           numeric(38,10),
  notes                text
);

CREATE INDEX IF NOT EXISTS idx_pnl_at ON pnl_snapshots (at);

-- Audit log for compliance: control actions and changes
CREATE TABLE IF NOT EXISTS audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at           timestamptz NOT NULL DEFAULT now(),
  actor        text,          -- e.g. user/email/token id
  actor_type   text,          -- 'user' | 'token' | 'system'
  action       text NOT NULL, -- e.g. 'kill_switch_toggle' | 'risk_limits_update'
  resource     text,          -- e.g. 'kill_switch' | 'risk_limits'
  resource_id  text,
  details      jsonb,
  ip           text,
  user_agent   text
);

CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log (at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_details ON audit_log USING GIN (details);

-- Trigger to maintain updated_at on orders
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_set_updated_at ON orders;
CREATE TRIGGER trg_orders_set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
