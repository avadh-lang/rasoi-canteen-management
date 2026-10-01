# Rasoi: Canteen Management System

Pre-order and canteen operations for the VCET canteen. Students order ahead for a pickup slot and pay from a prepaid wallet or UPI. The kitchen cooks from a live board, the counter bills walk-ins and hands over by token, and the manager runs the menu, stock, people and reports.

Built for **2115117 Software Engineering (TE Sem V)**, developed with the **incremental process model**.

## Quick start

Requires Node.js 20+ and Docker (for the local PostgreSQL).

```bash
npm install
cp .env.example .env          # then set SESSION_SECRET (openssl rand -base64 32)
docker compose up -d          # PostgreSQL 17 on localhost:5433
npm run setup                 # create the tables and load demo data
npm run dev                   # http://localhost:3000
```

Demo accounts (password `rasoi@123` for all, or tap one on the sign-in page):

| Role | Email | What to try |
|---|---|---|
| Student | `aarav@student.test` | Order, pick a slot, pay by wallet or UPI, watch the token |
| Kitchen | `kitchen@rasoi.test` | Start cooking, mark ready, cancel with refund |
| Counter | `counter@rasoi.test` | Walk-in billing, pickup handover, cash wallet top-up |
| Manager | `admin@rasoi.test` | Dashboard, menu and stock, people, settings, CSV export |

`npm run db:reset` wipes everything and reloads the demo data (7 days of order history).

## Signature feature: table orders with split bills

Friends rarely eat alone, and splitting a canteen bill over UPI afterwards is a chore. With **table orders**:

1. One student starts a table and gets a 4-letter code (no I, L or O, so it survives being shouted across the canteen). Share it on WhatsApp in one tap.
2. Friends join with the code from their own phones. Each person adds their own dishes; everyone sees every plate update live.
3. Each person sees their exact share, GST included, and taps **I'm in**. Changing your plate un-confirms you.
4. The host picks a pickup slot and places **one order with one token**. In a single database transaction, stock is reserved for the combined quantities and **each person's wallet is charged only their own share**. If any friend can't cover their share, nobody is charged.
5. If the host cancels before cooking starts, everyone gets their own share back.

GST is rounded per person and the order's tax is the sum of those, so the shares always add up to the bill exactly to the paisa (`src/lib/domain/split.ts`, fully unit tested).

The demo data includes an open table **`VADA`** (Diya hosting, Rohan joined): sign in as Aarav and join it.

## Features

**Students and staff**
- Menu with search, veg filter, FSSAI veg/non-veg marks, live stock ("3 left", sold out)
- Tray that survives refreshes, per-account
- Pickup slots with capacity limits, trimmed to what the kitchen can make in time
- Pay by canteen wallet or UPI (simulated payment step, no keys needed)
- Token page that updates live: received, cooking, ready, collected
- Cancel before cooking starts for an instant wallet refund
- Wallet top-up and full transaction history

**Kitchen**
- Live three-column board (new, cooking, at the counter)
- "To cook" tally across all open orders, for batching
- Late orders flagged; pickup times that are due soon highlighted

**Counter**
- Touch-friendly billing for walk-ins: cash (with change), UPI, or a student's wallet by roll number
- Packaged-only bills (water, chips) are handed over instantly and skip the kitchen
- Pickup screen for ready tokens; cash top-ups to student wallets

**Manager**
- Today's sales, average bill, open orders, average order-to-ready time
- 7-day sales, orders by hour, payment mix, best sellers, low stock
- Menu and stock management with one-tap availability and inline restock
- People: roles, switching accounts off, adding staff
- Opening hours, slot length and capacity, GST rate, pause online orders
- Orders by day, status and channel; CSV export
- Audit log of every order, payment, menu and settings change

## Architecture

```
Browser ──▶ proxy.ts (route guard: signed session + role)
              │
              ▼
        Next.js App Router ── Server Components (read)
              │               Server Actions   (write, re-check role in DB)
              ▼
        src/server/*    transactional services: orders, wallet, audit, analytics
              │
        src/lib/domain  pure business rules: order state machine, pricing + GST,
              │         pickup slots, IST time   ◀── unit tested, 100% branch coverage
              ▼
        Prisma ──▶ PostgreSQL
```

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Data | Prisma ORM, PostgreSQL 17 (Docker locally, Neon in production) |
| Auth | bcrypt password hashes, HS256 JWT in an httpOnly cookie (`jose`) |
| Validation | Zod on every action input |
| UI | Tailwind CSS 4, Archivo variable font, neo-brutalist design system |
| Tests | Vitest with V8 coverage |

### Correctness under load

- **No overselling.** Stock is decremented with `UPDATE … WHERE stock >= qty` inside the order transaction.
- **No double spending.** Wallet debits are guarded by `WHERE walletBalance >= amount`.
- **No lost updates.** Status changes are compare-and-set on the previous status; a stale screen gets "someone else just updated this order".
- **Unique daily tokens.** `@@unique([businessDate, token])` with a retry on collision.
- **Money in paise.** Integers everywhere; GST rounded half-up once per order.
- **Price history.** Order lines snapshot the name and price, so menu edits never rewrite past bills.

### Order lifecycle

```
PLACED ──▶ PREPARING ──▶ READY ──▶ COLLECTED
  │            │
  └─────┬──────┘
        ▼
    CANCELLED   (stock restored; wallet/UPI refunded to wallet, cash refunded at counter)
```

Who may make each move is enforced in `src/lib/domain/order-state.ts`: kitchen cooks and marks ready, the counter hands over, students can cancel only their own order and only before cooking starts.

### Security

- Passwords hashed with bcrypt; login throttled to 5 failures per 10 minutes per email, with constant-time comparison for unknown emails
- Session cookie is httpOnly, SameSite=Lax, Secure in production
- Every page and action re-reads the user from the database, so role changes and deactivation apply immediately
- CSV export neutralises spreadsheet formula injection

## Incremental development

Each increment was delivered, tested and tagged in git:

| Tag | Increment | Delivered |
|---|---|---|
| `v0.1.0` | 1. Core | Data model, domain rules, services, seed data, unit tests |
| `v0.2.0` | 2. Customer ordering | Accounts, menu, tray, checkout, token tracking, wallet |
| `v0.3.0` | 3. Kitchen and counter | Live kitchen board, POS billing, pickup, cash top-ups |
| `v1.0.0` | 4. Management | Dashboard analytics, menu/people/settings admin, orders, CSV, audit log |
| `v1.1.0` | 5. Table orders | Group ordering with a shareable code, per-person split bill, per-person refunds |

```bash
git tag -n            # list increments
git checkout v0.2.0   # run any earlier increment
```

## Mapping to the SE lab experiments

| Exp | Where it shows up in this project |
|---|---|
| 1. Process model | Incremental model; see the table above and `git log --oneline` |
| 2. SRS | Features section above is the functional requirements baseline |
| 5. Class / use case | Entities in `prisma/schema.prisma`; actors are the four roles |
| 6. DFD | Browser → proxy → actions → services → database (Architecture) |
| 7. State diagram | Order lifecycle above, implemented in `order-state.ts` |
| 9. SCM | Git history with one tagged version per increment |
| 10. White-box testing | `tests/*.test.ts`, each case names the branch it covers; `npm run test:coverage` |
| 11. Prototype and UAT | Demo accounts + `docs/UAT.md` acceptance scenarios |

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build && npm start` | Production build and server |
| `npm test` | Unit tests |
| `npm run test:coverage` | Tests with branch coverage report (`coverage/index.html`) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run db:reset` | Recreate the database with demo data |

## Going to production

- Set a strong `SESSION_SECRET`.
- Set `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) to your hosted PostgreSQL; `npm run build` applies migrations.
- Replace the simulated UPI step (`src/components/upi-sheet.tsx`) with a payment gateway, and confirm payment on the server via the gateway's webhook before placing the order.
- The in-memory login throttle is per server instance; use Redis if you run more than one.
