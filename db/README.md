# Postgres for Data & Compliance

This service is introduced via `docker-compose.yml` (service `postgres`) to persist:

- Orders / executions
- PnL snapshots
- Audit trail for control actions (kill switch toggles, risk limit updates, etc.)

No backend code changes are required yet. The schema is created on first startup from `db/init/01_schema.sql`.

## Connection

Defaults (overridable via environment):

- POSTGRES_DB: `arbdb`
- POSTGRES_USER: `arbuser`
- POSTGRES_PASSWORD: `arbpass`
- Port: `5432`

You can export overrides in a `.env` file at the repo root to be picked up by Docker Compose:

```
POSTGRES_DB=arbdb
POSTGRES_USER=arbuser
POSTGRES_PASSWORD=arbpass
```

## Bring up

```
docker compose up -d postgres
```

First start will run all scripts in `db/init/`.

## Verify

Using Docker:

```
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt"
```

Expected tables:

- `orders`
- `executions`
- `pnl_snapshots`
- `audit_log`

## Schema overview

- `orders`: Core order lifecycle with `status`, `notional_usd`, timestamps, and `exchange_order_id`.
- `executions`: Fills per order with price/qty and fees.
- `pnl_snapshots`: Periodic snapshots of realized/unrealized PnL.
- `audit_log`: Compliance log with actor, action, resource, and structured `details` (JSONB).

A trigger maintains `orders.updated_at` on updates.

## Next steps (optional)

- Wire backend endpoints to append to `audit_log` when kill switch and risk limits are changed.
- Add a periodic job to write to `pnl_snapshots` if desired.
- Introduce a migration tool later if the schema evolves (e.g., Alembic), keeping init SQL as bootstrap.
