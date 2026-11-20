# BUILD.md — Haat: Multi-Vendor E-Commerce Marketplace

> A senior-engineer build playbook. Follow phases in order. Each phase has a **Definition of Done (DoD)** — do not move on until it passes.
> Stack: React + TypeScript + Tailwind · Node + Express + Prisma + PostgreSQL · Redis · Elasticsearch · S3 · Razorpay Route (or Stripe Connect) · Docker.
> Working name: **Haat** (Hindi for a local market where many sellers trade in one place). Rename freely.

---

## 0. How to use this file

1. Read sections 1–4 once (architecture, decisions, schema, API). These are the contract.
2. Execute Phases 1–10 (Section 6) in order. Commit at the end of every phase.
3. If time is short, use the **Cut List** (Section 14). A working core flow beats a broken full flow.
4. If you use an AI coding agent (Claude Code, etc.), paste one phase at a time plus Sections 2–4 as context. Never paste the whole file and say "build everything".

**The one flow that must work end-to-end (the demo spine):**
`Vendor registers → admin approves → vendor lists product with image → customer searches → adds to cart → pays (test mode) → payment splits to vendor minus commission → vendor ships → customer receives invoice PDF → customer reviews → admin sees revenue.`

Everything in this document exists to make that flow reliable and impressive.

---

## 1. Architecture

```
┌──────────────┐    HTTPS     ┌───────────────────────────────┐
│ React + TS   │ ───────────▶ │ Express API (TypeScript)      │
│ Vite/Tailwind│ ◀─────────── │ modules: auth, vendors,       │
│ (Vercel)     │    JSON      │ catalog, search, cart, orders,│
└──────────────┘              │ payments, reviews, coupons,   │
                              │ invoices, admin               │
                              └──┬────┬────┬────┬────┬────────┘
                                 │    │    │    │    │
                          Postgres  Redis  ES   S3  Razorpay/Stripe
                          (Prisma) (cart, (search) (images) (split pay)
                                   session,
                                   rate-limit)
```

**Principles**

- **Modular monolith**, not microservices. One deployable API, strict module boundaries (`routes → controller → service → repository`). Easy to deploy twice (FE/BE separately) and easy to explain.
- **Postgres is the source of truth.** Elasticsearch is a read-optimized *projection* of products. Redis holds *ephemeral* state only (cart, sessions, cache, rate limits). If ES or Redis dies, nothing is lost.
- **Money is integers in paise** (`Int`/`BigInt`). Never floats. Format only at the UI edge.
- **Never trust the client for prices.** The server recomputes totals from DB prices on checkout.
- **Webhooks are the source of truth for payment success**, not the browser redirect.
- **Idempotency everywhere money moves** (payment webhooks, transfers, order creation).

### Key design decisions (write these in your README — reviewers love it)

| Decision | Choice | Why |
|---|---|---|
| Order model | `Order` (customer-facing) → many `VendorOrder` (one per vendor) | A cart with items from 3 vendors ships/refunds/settles independently. Status lifecycle lives on `VendorOrder`. |
| Payment split | One customer charge → per-vendor transfers (separate charges & transfers) | Matches multi-vendor carts. Platform keeps `commission`. |
| Provider | `PaymentProvider` interface; **Razorpay Route** implementation (India-native), Stripe Connect as optional second adapter | Swappable, testable with a fake provider. |
| Search | Elasticsearch, with **Postgres `pg_trgm` fallback** behind `SEARCH_DRIVER=es|pg` | App still runs if ES is down/too heavy for free hosting. |
| Auth | Short-lived access JWT (15 min) + httpOnly refresh cookie (7 d) with rotation; refresh token hash stored in DB | Secure, standard, defensible in review. |
| Cart | Redis hash per user/guest, merged on login | Fast, TTL-based, matches the brief. |
| Stock | Decrement inside a DB transaction with `UPDATE … WHERE stock >= qty` | Prevents overselling under concurrency. |

---

## 2. Roles & permissions

| Capability | Customer | Vendor | Admin |
|---|:--:|:--:|:--:|
| Browse/search/view products | ✅ | ✅ | ✅ |
| Cart, checkout, own orders, reviews | ✅ | – | – |
| Apply for vendor account / manage store | – | ✅ (own) | ✅ (all) |
| Product CRUD | – | ✅ own products only | ✅ any |
| Update `VendorOrder` status (packed/shipped) | – | ✅ own orders only | ✅ |
| Create coupons | – | ✅ vendor-scoped | ✅ platform-wide |
| Approve/suspend vendors, set commission | – | – | ✅ |
| Analytics | – | own sales dashboard | platform dashboard |

Enforce in middleware (`requireRole`) **and** at query level (`where: { vendorId: req.user.vendorId }`). Ownership checks at query level are what stops IDOR bugs — test them.

---

## 3. Repository layout (monorepo)

```
haat/
├─ apps/
│  ├─ api/
│  │  ├─ prisma/ (schema.prisma, migrations/, seed.ts)
│  │  ├─ src/
│  │  │  ├─ config/        env.ts (zod-validated), logger.ts
│  │  │  ├─ lib/           prisma.ts, redis.ts, es.ts, s3.ts, razorpay.ts
│  │  │  ├─ middleware/    auth.ts, requireRole.ts, validate.ts, error.ts, rateLimit.ts
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/ vendors/ products/ search/ cart/
│  │  │  │  ├─ orders/ payments/ reviews/ coupons/ invoices/ admin/
│  │  │  │  └─ (each: routes.ts, controller.ts, service.ts, schema.ts, *.test.ts)
│  │  │  ├─ jobs/          indexProduct.ts, reconcilePayments.ts (simple in-process)
│  │  │  ├─ app.ts         express app (no listen — for tests)
│  │  │  └─ server.ts
│  │  ├─ Dockerfile
│  │  └─ package.json
│  └─ web/
│     ├─ src/
│     │  ├─ app/           router.tsx, providers.tsx
│     │  ├─ components/ui/ Button, Input, Badge, Modal, Toast, Skeleton, EmptyState…
│     │  ├─ features/      auth, catalog, cart, checkout, orders, vendor, admin, reviews
│     │  ├─ lib/           api.ts (axios + refresh interceptor), money.ts, cn.ts
│     │  ├─ hooks/         useDebounce, useCart…
│     │  └─ main.tsx
│     ├─ Dockerfile, nginx.conf (for local compose)
│     └─ package.json
├─ packages/shared/        zod schemas + TS types shared by api & web
├─ docker-compose.yml
├─ .env.example
├─ .github/workflows/ci.yml
├─ README.md  (architecture diagram, ERD, setup, demo creds, decisions)
└─ BUILD.md
```

Use **pnpm workspaces**. Share Zod schemas from `packages/shared` so request validation is written once.

**Libraries**
- API: `express`, `zod`, `prisma`, `@prisma/client`, `jsonwebtoken`, `bcrypt`, `cookie-parser`, `helmet`, `cors`, `express-rate-limit`, `ioredis`, `@elastic/elasticsearch`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `razorpay` (or `stripe`), `pdfkit`, `pino`, `vitest`, `supertest`.
- Web: `react`, `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `axios`, `tailwindcss`, `lucide-react`, `recharts`, `sonner` (toasts), `clsx`/`tailwind-merge`.

---

## 4. Database schema (Prisma)

Paste into `apps/api/prisma/schema.prisma` and refine.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { CUSTOMER VENDOR ADMIN }
enum VendorStatus { PENDING APPROVED SUSPENDED REJECTED }
enum ProductStatus { DRAFT ACTIVE ARCHIVED }
enum OrderStatus { PENDING_PAYMENT PAID CANCELLED REFUNDED }      // customer-level
enum FulfilmentStatus { PLACED PACKED SHIPPED DELIVERED CANCELLED } // vendor-level
enum PaymentStatus { CREATED AUTHORIZED CAPTURED FAILED REFUNDED }
enum CouponType { PERCENT FLAT }
enum PayoutStatus { PENDING PROCESSED FAILED }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  role          Role     @default(CUSTOMER)
  createdAt     DateTime @default(now())
  vendor        Vendor?
  addresses     Address[]
  orders        Order[]
  reviews       Review[]
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  revokedAt DateTime?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Address {
  id String @id @default(cuid())
  userId String
  fullName String
  phone String
  line1 String
  line2 String?
  city String
  state String
  pincode String
  isDefault Boolean @default(false)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Vendor {
  id              String       @id @default(cuid())
  userId          String       @unique
  storeName       String
  slug            String       @unique
  description     String?
  logoUrl         String?
  status          VendorStatus @default(PENDING)
  commissionBps   Int          @default(1000)   // 1000 = 10.00%; admin-editable per vendor
  gatewayAccountId String?     // Razorpay linked account / Stripe acct id
  createdAt       DateTime     @default(now())
  user            User         @relation(fields: [userId], references: [id])
  products        Product[]
  vendorOrders    VendorOrder[]
  coupons         Coupon[]
}

model Category {
  id String @id @default(cuid())
  name String @unique
  slug String @unique
  parentId String?
  parent Category? @relation("Tree", fields: [parentId], references: [id])
  children Category[] @relation("Tree")
  products Product[]
}

model Product {
  id           String        @id @default(cuid())
  vendorId     String
  categoryId   String
  title        String
  slug         String        @unique
  description  String
  pricePaise   Int
  mrpPaise     Int?
  stock        Int           @default(0)
  status       ProductStatus @default(DRAFT)
  ratingAvg    Float         @default(0)
  ratingCount  Int           @default(0)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  vendor       Vendor        @relation(fields: [vendorId], references: [id])
  category     Category      @relation(fields: [categoryId], references: [id])
  images       ProductImage[]
  reviews      Review[]
  orderItems   OrderItem[]
  @@index([vendorId]) @@index([categoryId]) @@index([status, createdAt])
}

model ProductImage {
  id String @id @default(cuid())
  productId String
  key String        // S3 object key
  url String
  position Int @default(0)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Coupon {
  id String @id @default(cuid())
  code String @unique
  type CouponType
  value Int              // percent (1-100) or paise
  maxDiscountPaise Int?
  minOrderPaise Int @default(0)
  vendorId String?       // null = platform-wide
  usageLimit Int?
  usedCount Int @default(0)
  perUserLimit Int @default(1)
  startsAt DateTime
  expiresAt DateTime
  active Boolean @default(true)
  vendor Vendor? @relation(fields: [vendorId], references: [id])
  redemptions CouponRedemption[]
}
model CouponRedemption {
  id String @id @default(cuid())
  couponId String
  userId String
  orderId String
  coupon Coupon @relation(fields: [couponId], references: [id])
  @@unique([couponId, orderId])
}

model Order {
  id             String      @id @default(cuid())
  number         String      @unique        // HAAT-2026-000123
  userId         String
  status         OrderStatus @default(PENDING_PAYMENT)
  subtotalPaise  Int
  discountPaise  Int         @default(0)
  shippingPaise  Int         @default(0)
  totalPaise     Int
  couponCode     String?
  shippingAddress Json                       // snapshot, not FK
  idempotencyKey String?     @unique
  createdAt      DateTime    @default(now())
  user           User        @relation(fields: [userId], references: [id])
  vendorOrders   VendorOrder[]
  payments       Payment[]
}

model VendorOrder {
  id               String           @id @default(cuid())
  orderId          String
  vendorId         String
  status           FulfilmentStatus @default(PLACED)
  subtotalPaise    Int
  discountPaise    Int @default(0)
  commissionPaise  Int
  vendorPayoutPaise Int
  trackingNumber   String?
  statusHistory    OrderStatusEvent[]
  items            OrderItem[]
  payout           Payout?
  order            Order  @relation(fields: [orderId], references: [id])
  vendor           Vendor @relation(fields: [vendorId], references: [id])
  @@index([vendorId, status])
}

model OrderStatusEvent {
  id String @id @default(cuid())
  vendorOrderId String
  status FulfilmentStatus
  note String?
  createdAt DateTime @default(now())
  vendorOrder VendorOrder @relation(fields: [vendorOrderId], references: [id], onDelete: Cascade)
}

model OrderItem {
  id String @id @default(cuid())
  vendorOrderId String
  productId String
  titleSnapshot String
  imageSnapshot String?
  unitPricePaise Int
  quantity Int
  vendorOrder VendorOrder @relation(fields: [vendorOrderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])
}

model Payment {
  id String @id @default(cuid())
  orderId String
  provider String                    // "razorpay" | "stripe"
  providerOrderId String @unique
  providerPaymentId String? @unique
  amountPaise Int
  status PaymentStatus @default(CREATED)
  rawEvent Json?
  createdAt DateTime @default(now())
  order Order @relation(fields: [orderId], references: [id])
}

model Payout {
  id String @id @default(cuid())
  vendorOrderId String @unique
  providerTransferId String? @unique
  amountPaise Int
  status PayoutStatus @default(PENDING)
  vendorOrder VendorOrder @relation(fields: [vendorOrderId], references: [id])
}

model WebhookEvent {            // idempotency ledger
  id String @id               // provider event id
  type String
  processedAt DateTime @default(now())
}

model Review {
  id String @id @default(cuid())
  productId String
  userId String
  rating Int                   // 1..5
  title String?
  body String
  verifiedPurchase Boolean @default(true)
  createdAt DateTime @default(now())
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])
  @@unique([productId, userId])   // one review per user per product
}
```

**Also draw an ERD** (dbdiagram.io or `prisma-erd-generator`) and put the image in `/docs/erd.png` and README. This is Milestone 1's explicit deliverable.

### Order lifecycle (state machine)

```
Order:        PENDING_PAYMENT ──(payment.captured)──▶ PAID ──▶ (refund) REFUNDED
                     └─(timeout/failed)──▶ CANCELLED

VendorOrder:  PLACED ──▶ PACKED ──▶ SHIPPED ──▶ DELIVERED
                 └──────────┴───────────┴──▶ CANCELLED (only before SHIPPED)
```

Implement transitions as a **pure map** so illegal jumps are impossible:

```ts
const NEXT: Record<FulfilmentStatus, FulfilmentStatus[]> = {
  PLACED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};
export const canMove = (from: FulfilmentStatus, to: FulfilmentStatus) => NEXT[from].includes(to);
```

Every transition writes an `OrderStatusEvent` (powers the tracking timeline UI).

---

## 5. API list

Base: `/api/v1`. All inputs validated with Zod. All errors: `{ error: { code, message, details? } }`.

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | role forced to CUSTOMER |
| POST | `/auth/login` | returns access token, sets refresh cookie |
| POST | `/auth/refresh` | rotates refresh token |
| POST | `/auth/logout` | revokes refresh token |
| GET | `/auth/me` | current user + vendor status |

### Vendors
| POST | `/vendors/apply` | customer → creates PENDING vendor |
| GET | `/vendors/me` | own store |
| PATCH | `/vendors/me` | edit store profile |
| POST | `/vendors/me/payout-account` | create linked account at gateway |
| GET | `/vendors/:slug` | public storefront |
| GET | `/vendors/me/orders` | VendorOrders for my store (filter by status) |
| PATCH | `/vendor-orders/:id/status` | PACKED/SHIPPED(+tracking)/DELIVERED |
| GET | `/vendors/me/analytics` | sales, top products |

### Catalog
| GET | `/products` | list + filters (DB fallback) |
| GET | `/products/:slug` | detail + images + rating summary |
| POST | `/products` | vendor |
| PATCH/DELETE | `/products/:id` | owner only (soft delete → ARCHIVED) |
| POST | `/uploads/presign` | returns presigned S3 PUT URL (type/size validated) |
| GET | `/categories` | tree |

### Search
| GET | `/search?q=&category=&minPrice=&maxPrice=&rating=&vendor=&sort=&page=&limit=` | `sort`: relevance, price_asc, price_desc, newest, rating |
| GET | `/search/suggest?q=` | autocomplete |

### Cart (Redis)
| GET | `/cart` | enriched with live prices/stock |
| POST | `/cart/items` | `{productId, qty}` |
| PATCH | `/cart/items/:productId` | set qty |
| DELETE | `/cart/items/:productId` | |
| POST | `/cart/coupon` / DELETE | validate + preview |
| POST | `/cart/merge` | guest → user on login |

### Checkout / Orders / Payments
| POST | `/checkout` | header `Idempotency-Key`; validates stock, creates Order+VendorOrders, creates gateway order; returns `{orderId, gatewayOrderId, amount, key}` |
| POST | `/payments/verify` | client signature check (UX only — webhook is truth) |
| POST | `/webhooks/razorpay` | raw body, signature verified, idempotent |
| GET | `/orders` / `/orders/:id` | customer's orders + timeline |
| POST | `/orders/:id/cancel` | only if no vendor order shipped |
| GET | `/orders/:id/invoice` | PDF stream (owner/admin) |

### Reviews / Coupons
| GET | `/products/:id/reviews` | paginated |
| POST | `/products/:id/reviews` | only users with a DELIVERED item (verified purchase) |
| POST/GET/PATCH | `/coupons` | vendor/admin |

### Admin
| GET | `/admin/vendors?status=` | |
| PATCH | `/admin/vendors/:id` | approve / suspend / set `commissionBps` |
| GET | `/admin/analytics` | GMV, commission earned, orders/day, top vendors/categories |
| GET | `/admin/orders`, `/admin/users` | |

---

## 6. Build phases

### Phase 1 — Foundation (Day 1)

1. `pnpm init` workspaces; scaffold `apps/api`, `apps/web`, `packages/shared`.
2. API: TypeScript strict, `tsx` for dev, `zod`-validated `env.ts` (fail fast on missing env), `pino` logger, `helmet`, `cors` (allow only `WEB_ORIGIN`, `credentials: true`), global error handler, `/health` endpoint (checks DB, Redis, ES).
3. `docker-compose.yml` (below) with Postgres, Redis, Elasticsearch, and optionally MinIO as local S3.
4. Prisma schema → `prisma migrate dev` → seed script skeleton.
5. Web: Vite + React + TS + Tailwind, router, React Query provider, axios instance.
6. Draw the ERD. Write the API list into `/docs/api.md`.
7. ESLint + Prettier + Husky pre-commit + GitHub Actions (lint, typecheck, test).

**docker-compose.yml**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: haat, POSTGRES_PASSWORD: haat, POSTGRES_DB: haat }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL","pg_isready -U haat"], interval: 5s, retries: 10 }
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.15.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports: ["9200:9200"]
    volumes: [esdata:/usr/share/elasticsearch/data]
  minio:                       # optional local S3
    image: minio/minio
    command: server /data --console-address ":9001"
    environment: { MINIO_ROOT_USER: minio, MINIO_ROOT_PASSWORD: minio12345 }
    ports: ["9000:9000","9001:9001"]
    volumes: [miniodata:/data]
  api:
    build: ./apps/api
    env_file: .env
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_started } }
    ports: ["4000:4000"]
  web:
    build: ./apps/web
    ports: ["5173:80"]
volumes: { pgdata: {}, esdata: {}, miniodata: {} }
```

**DoD:** `docker compose up` brings everything up; `GET /health` is green; CI passes on an empty test.

---

### Phase 2 — Auth & RBAC (Day 2)

- Register/login with `bcrypt` (cost 12). Zod: email, password ≥ 8 chars.
- Access JWT (15 min, payload `{sub, role, vendorId?}`), refresh token = random 48 bytes, store **SHA-256 hash** in DB, send as `httpOnly; Secure; SameSite=Lax` cookie. Rotate on each refresh; revoke old one. Reuse of a revoked token → revoke all of that user's tokens.
- Middleware: `authenticate` (verify JWT) and `requireRole(...roles)`.
- Rate-limit `/auth/*` (Redis store): 10/min/IP.
- Web: axios interceptor — on 401, call `/auth/refresh` once (queue concurrent requests), retry; otherwise redirect to login. `<ProtectedRoute roles={[...]}>`.
- Seed an admin: `admin@haat.test / Admin@123`.

```ts
// middleware/requireRole.ts
export const requireRole = (...roles: Role[]) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this.' } });
```

**DoD:** tests prove: customer can't hit vendor/admin routes, expired token refreshes silently, logout revokes.

---

### Phase 3 — Vendor onboarding, products, S3 upload (Days 3–4)

- Vendor flow: customer applies (`/vendors/apply`) → status PENDING → admin approves → `User.role = VENDOR`. Only APPROVED vendors can publish products.
- Product CRUD with ownership check at query level. Slug = slugified title + short id. Soft-delete via ARCHIVED.
- **Image upload with presigned URLs** (browser uploads directly to S3 — API never touches bytes):

```ts
// POST /uploads/presign  { filename, contentType, size }
const ALLOWED = ['image/jpeg','image/png','image/webp'];
if (!ALLOWED.includes(contentType) || size > 5*1024*1024) throw badRequest();
const key = `products/${vendorId}/${crypto.randomUUID()}.${ext(contentType)}`;
const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), { expiresIn: 60 });
res.json({ uploadUrl: url, key, publicUrl: `${CDN_BASE}/${key}` });
```
- S3 bucket: block public ACLs, allow public read only via bucket policy on `products/*` (or CloudFront). CORS: allow `PUT` from `WEB_ORIGIN`.
- Web (vendor dashboard): drag-and-drop multi-image uploader with progress, reorder, first image = cover; product form with react-hook-form + Zod; table with status badges and inline stock edit.
- On every product create/update/archive → enqueue index/de-index job (Phase 4).

**DoD:** vendor A cannot edit vendor B's product (test). Images appear on the product card from S3.

---

### Phase 4 — Search with Elasticsearch (Day 5)

**Index mapping**
```json
{
  "settings": { "analysis": { "analyzer": {
    "autocomplete": { "tokenizer": "edge_ngram_tok", "filter": ["lowercase"] } },
    "tokenizer": { "edge_ngram_tok": { "type": "edge_ngram", "min_gram": 2, "max_gram": 15, "token_chars": ["letter","digit"] } } } },
  "mappings": { "properties": {
    "title":       { "type": "text", "fields": { "ac": { "type": "text", "analyzer": "autocomplete", "search_analyzer": "standard" } } },
    "description": { "type": "text" },
    "categoryId":  { "type": "keyword" }, "categorySlug": { "type": "keyword" },
    "vendorId":    { "type": "keyword" }, "vendorName": { "type": "keyword" },
    "pricePaise":  { "type": "integer" }, "ratingAvg": { "type": "float" },
    "inStock":     { "type": "boolean" }, "createdAt": { "type": "date" }
  } }
}
```

**Query shape**
```ts
const must = q ? [{ multi_match: { query: q, fields: ['title^3','title.ac^2','description'], fuzziness: 'AUTO' } }] : [{ match_all: {} }];
const filter = [{ term: { status: 'ACTIVE' } }];
if (category) filter.push({ term: { categorySlug: category } });
if (minPrice || maxPrice) filter.push({ range: { pricePaise: { gte: minPrice, lte: maxPrice } } });
if (rating) filter.push({ range: { ratingAvg: { gte: rating } } });
const sort = { price_asc:[{pricePaise:'asc'}], price_desc:[{pricePaise:'desc'}], newest:[{createdAt:'desc'}], rating:[{ratingAvg:'desc'}], relevance:['_score'] }[sortKey];
// + aggs: categories (terms), price ranges (range), vendors (terms) → drives the filter sidebar counts
```

- **Sync strategy:** after DB commit, call `indexProduct(id)` (in-process queue with retry). Add `pnpm reindex` script that rebuilds the whole index from Postgres — your safety net.
- **Fallback:** `SEARCH_DRIVER=pg` uses `pg_trgm` (`CREATE EXTENSION pg_trgm; CREATE INDEX … USING gin (title gin_trgm_ops)`) with the same response shape. Mention this in README.
- Return facets (`aggs`) so the UI shows "Electronics (42)".

**DoD:** typo query ("samsng") still finds Samsung; filters and sort work; facets update with filters; `pnpm reindex` works from empty index.

---

### Phase 5 — Cart (Redis), checkout, order lifecycle (Days 6–7)

**Cart in Redis**
- Key `cart:{userId}` or `cart:guest:{cookieId}`, hash `productId → qty`, TTL 30 days (guest 7 days), refreshed on write.
- `GET /cart` reads hash, then loads product rows from Postgres (one `findMany`) to attach **current** price/stock/title; flags items that became unavailable or price-changed. Never store price in Redis.
- `POST /cart/merge` on login: add guest quantities (cap by stock), delete guest key.
- Cache hot reads (`GET /products/:slug`, category tree) in Redis for 60 s with explicit invalidation on product update.

**Checkout transaction (the most important code in the project)**
```ts
async function checkout(userId, addressId, couponCode, idemKey) {
  // 0. idempotency: if Order with this idempotencyKey exists → return it
  const cart = await cartService.getDetailed(userId);          // live prices
  assertNotEmpty(cart);
  return prisma.$transaction(async (tx) => {
    // 1. lock & decrement stock atomically, per line
    for (const line of cart.lines) {
      const { count } = await tx.product.updateMany({
        where: { id: line.productId, status: 'ACTIVE', stock: { gte: line.qty } },
        data:  { stock: { decrement: line.qty } },
      });
      if (count === 0) throw new ConflictError(`"${line.title}" is out of stock`);
    }
    // 2. group lines by vendor
    // 3. coupon: validate (window, limits, min order, scope) → discount; allocate pro-rata across vendors
    // 4. per vendor: commission = round(vendorSubtotalAfterDiscount * commissionBps / 10000)
    //                payout     = vendorSubtotalAfterDiscount - commission
    // 5. create Order (PENDING_PAYMENT) + VendorOrder[] + OrderItem[] (with title/price snapshots)
    // 6. create gateway order for order.totalPaise → save Payment(CREATED)
    return order;
  });
  // after commit: clear cart ONLY when payment succeeds (webhook), not here
}
```
- **Stock reservation expiry:** a cron (every 5 min) cancels `PENDING_PAYMENT` orders older than 30 min and **restores stock**. Without this, abandoned checkouts leak inventory.
- **Rounding rule (document it):** compute commission per vendor with `Math.round`; allocate any 1-paise remainder of discount to the largest vendor so `sum(vendorOrders) === order.total`. Add a unit test asserting this invariant over random carts.
- Vendor dashboard: orders table with tabs (Placed / Packed / Shipped / Delivered), "Mark packed", "Mark shipped" (tracking number input), each writing an `OrderStatusEvent`.
- Customer: order detail page with a vertical timeline per vendor shipment.

**DoD:** two concurrent checkouts of the last unit → exactly one succeeds (test with `Promise.all`). Abandoned order expires and restores stock.

---

### Phase 6 — Split payments & commissions (Days 8–9)

> **Pick Razorpay Route** (works natively in India; test mode is free). Keep Stripe Connect as an alternative adapter. **Verify exact endpoint/field names against the current official docs while implementing** — gateway APIs evolve.

**Provider interface**
```ts
interface PaymentProvider {
  createOrder(a: { amountPaise: number; receipt: string }): Promise<{ id: string }>;
  verifyCheckoutSignature(a: { orderId: string; paymentId: string; signature: string }): boolean;
  verifyWebhook(rawBody: Buffer, signature: string): boolean;
  createLinkedAccount(v: Vendor): Promise<{ accountId: string }>;
  transfer(a: { paymentId: string; accountId: string; amountPaise: number; notes: any }): Promise<{ id: string }>;
  refund(a: { paymentId: string; amountPaise: number }): Promise<{ id: string }>;
}
```
Ship a `FakeProvider` for tests/demo fallback.

**Flow**
1. Vendor adds payout account (`POST /vendors/me/payout-account`) → create linked account → store `gatewayAccountId`. Block product publishing until set (or allow publishing but block checkout for that vendor).
2. `/checkout` returns `{ gatewayOrderId, amount, keyId }`. Frontend opens Razorpay Checkout (`checkout.js`) with test card (`4111 1111 1111 1111`, any future expiry/CVV) or UPI `success@razorpay`.
3. Handler → `POST /payments/verify` (HMAC check) to update UI instantly.
4. **Webhook `payment.captured` is the truth:**
```ts
app.post('/api/v1/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!provider.verifyWebhook(req.body, req.header('x-razorpay-signature')!)) return res.sendStatus(400);
  const event = JSON.parse(req.body.toString());
  const eventId = req.header('x-razorpay-event-id')!;
  try { await prisma.webhookEvent.create({ data: { id: eventId, type: event.event } }); }
  catch { return res.sendStatus(200); }                 // already processed → idempotent
  if (event.event === 'payment.captured') await paymentService.onCaptured(event.payload.payment.entity);
  if (event.event === 'payment.failed')   await paymentService.onFailed(event.payload.payment.entity);
  res.sendStatus(200);
});
```
   Mount this route **before** `express.json()`; it needs the raw body.
5. `onCaptured` (in one transaction): mark `Payment` CAPTURED, `Order` PAID, clear cart, create `Payout(PENDING)` per `VendorOrder`; then for each vendor call `provider.transfer(...)` with `amount = vendorPayoutPaise`, saving `providerTransferId` and `Payout.PROCESSED`. Failed transfer → `Payout.FAILED` + retry job; **never** fail the webhook response because of a transfer error.
6. Platform commission = payment total − Σ payouts (stays in platform balance). Record it; admin analytics reads it from `VendorOrder.commissionPaise`.
7. Cancel/refund before shipping → `provider.refund` (+ reverse transfer if already sent) → `Order.REFUNDED`, restore stock.

Local webhook testing: `ngrok http 4000` → paste URL into gateway dashboard.

**DoD:** test-mode payment on a 2-vendor cart creates 2 transfers whose sum + commission = amount paid; replaying the same webhook does nothing; tampered signature → 400.

---

### Phase 7 — Reviews, coupons, invoices, admin analytics (Day 10)

**Reviews**
- Allowed only if user has a `DELIVERED` `OrderItem` for that product (verified purchase); unique per (product, user).
- Recompute `ratingAvg/ratingCount` incrementally in the same transaction; re-index product in ES.
- UI: star distribution bars, "Verified purchase" badge, sort by newest/highest, helpful empty state.

**Coupons**
- Validate: active, in window, `usedCount < usageLimit`, per-user limit, min order, scope (vendor-specific coupons only discount that vendor's lines). Record `CouponRedemption` inside the checkout transaction; increment `usedCount` with a conditional update to avoid races.
- Cart shows a live discount preview with a clear error per failure reason ("This code needs ₹500 more in your cart").

**PDF invoices (`pdfkit`)**
- Per **Order** invoice, grouped by vendor "Sold by …", with line items, discount, shipping, total, order number, date, GST-style placeholder fields. Stream with `Content-Type: application/pdf`; auth-check owner/admin. Optionally store generated PDF to S3 and email link.
- Format money via a single `formatINR(paise)` helper (shared package).

**Admin analytics** (`/admin/analytics`, SQL aggregates, cache 60 s in Redis)
- KPI cards: GMV, commission earned, orders, active vendors.
- Charts (Recharts): revenue & commission per day (30 d), orders by status, top 10 vendors, top categories.
- Tables: vendor approval queue, vendor commission editor (inline), recent orders.
- Vendor analytics (own): sales/day, top products, pending payouts.

**DoD:** commission total on dashboard equals Σ `VendorOrder.commissionPaise` for paid orders (test it).

---

### Phase 8 — Frontend UX build-out (runs alongside, finishing Days 11–12)

See Section 8 for the design system and page list. Do **not** leave UI to the last day — build each page when its API lands.

### Phase 9 — Testing & hardening (Day 12)

See Section 10.

### Phase 10 — Deploy & polish (Days 13–14)

See Sections 11–13.

---

## 7. Seed data (makes the demo feel real)

`prisma/seed.ts`:
- 1 admin, 5 vendors (3 approved with gateway accounts, 1 pending, 1 suspended), 10 customers.
- ~15 categories (2 levels), **150–300 products** pulled from **DummyJSON** (`https://dummyjson.com/products?limit=100`) + **Fake Store API**; distribute across vendors; upload images by *URL reference* (don't re-upload to S3 in seed — store the remote URL).
- Reviews from DummyJSON reviews; ~30 sample orders in varied statuses across the last 30 days (so analytics charts aren't empty).
- Run `pnpm reindex` after seeding.
- Document demo credentials in README: `admin@haat.test`, `vendor1@haat.test`, `customer@haat.test` (password `Demo@1234`).
- Optional bulk dataset: Olist/Flipkart CSV → script to import. Only if time permits.

---

## 8. UI / UX design system

### Direction
A marketplace should feel like a **busy, trustworthy market**, not a generic SaaS template. Calm structure, confident price/trust signals, fast scanning. Avoid the default "white cards + gradient hero + purple" look.

**Design tokens (`tailwind.config.ts`)**

| Token | Value | Use |
|---|---|---|
| `ink` | `#16202A` | text, headings |
| `paper` | `#F6F7F9` | page background (cool, not cream) |
| `surface` | `#FFFFFF` | panels |
| `line` | `#E3E7EC` | borders |
| `brand` | `#0E6B63` (deep teal) | primary buttons, links |
| `brand-ink` | `#094A45` | hover/active |
| `saffron` | `#F2A20C` | deals, ratings stars, one highlight per screen |
| `danger` / `success` | `#C23A31` / `#1F8A4C` | states |

- **Type:** headings `Bricolage Grotesque` (600/700), body/UI `IBM Plex Sans` (400/500/600). Tabular numbers (`font-variant-numeric: tabular-nums`) for prices. Scale: 12/14/16/18/24/32/44. Body line-height 1.55, max line length ~70ch.
- **Radius:** 6px for inputs/buttons, 10px for product cards/panels, 999px only for pills. Deliberately vary — not one radius everywhere.
- **Spacing:** 4px base grid; section gaps 32/48/64.
- **Shadow:** none by default; subtle border instead. One elevation (popover/modal) only.
- **Motion:** 150–200 ms for responses to user action (add-to-cart badge bump, drawer slide, skeleton → content). No decorative scroll animations. Respect `prefers-reduced-motion`.
- **Icons:** `lucide-react`, 1.5px stroke, consistent 20px.

### Spend the boldness in one place
The **product grid + filter sidebar** is the memorable surface: dense but breathable cards, big readable prices, clear stock/discount badges, instant filter feedback. Everything else stays quiet.

### Storefront pages
1. **Home** — Header with search first (not a hero banner). Below: category chips row, "Fresh from vendors" grid, "Top rated this week", "Shop by store" carousel (vendor logos). Real products above the fold.
2. **Search / Category** — Left sidebar filters (category tree with counts, price range slider + inputs, rating ≥, vendor, in-stock) · top bar: result count, sort dropdown, active filter chips (removable) · grid 2/3/4 columns responsive · URL-synced filters (`?q=&category=&sort=`) so results are shareable and back-button safe · skeleton cards while loading · "No results for 'x'" with suggestions and a clear-filters button · pagination or infinite scroll (pick pagination for SEO/simplicity).
3. **Product detail** — Image gallery with thumbnails + zoom · title, vendor link ("Sold by X"), rating summary → scrolls to reviews · price large, MRP struck through, % off · stock state ("Only 3 left") · qty stepper · **Add to cart** (primary) + **Buy now** · delivery info block · description · reviews with distribution bars · "More from this vendor".
4. **Cart** (drawer + full page) — Items **grouped by vendor** ("Sold by …"), qty steppers, remove, price-change warnings, coupon field with inline validation, sticky order summary (subtotal, discount, shipping, total), clear CTA "Continue to checkout".
5. **Checkout** — 3 compact steps on one page: Address (saved addresses + add new) → Review → Pay. Order summary pinned. Button text states the amount: **"Pay ₹2,499"**. Disable on submit; show processing state; handle popup-closed/failed with a retry that reuses the same order.
6. **Order confirmation** — Order number, per-vendor shipment cards, "Download invoice".
7. **My orders / detail** — Status pills, per-vendor vertical timeline (Placed → Packed → Shipped → Delivered) with timestamps, tracking number, cancel (when allowed), "Write a review" once delivered.
8. **Auth** — Single clean page, inline validation, show/hide password, role-aware redirect after login.

### Vendor dashboard (`/vendor`)
Sidebar: Overview · Products · Orders · Coupons · Store settings · Payouts.
- Overview: today's orders, revenue this week, low-stock alerts, chart.
- Products: searchable table, status filter, bulk actions (archive), "Add product" form with live preview card, multi-image uploader.
- Orders: tabs by status; row actions "Mark packed / Ship"; ship modal asks tracking number.
- Onboarding checklist banner until approved + payout account set (store details ✓ → admin approval ⏳ → payout account ✗).

### Admin (`/admin`)
Overview KPIs + charts · Vendors (approval queue with approve/reject, commission editor) · Orders · Users · Coupons.

### UX quality checklist (apply to every screen)
- **Every async view has 4 states:** loading (skeleton, not spinner), empty (explains + next action), error (what failed + Retry), success.
- Optimistic UI for cart add/remove and qty change (roll back on error).
- Buttons say what they do ("Add to cart", "Save changes", "Mark as shipped"); toasts reuse the same verb ("Added to cart").
- Sentence case everywhere. Errors never apologize and always say how to fix.
- Forms: labels always visible (no placeholder-only), inline errors on blur, preserve input on failure, correct `autocomplete`/`inputmode`.
- Accessibility: visible focus ring (2px brand outline), 4.5:1 contrast, semantic landmarks, `aria-live` for toasts and cart count, keyboard-operable gallery/dropdowns/modals (focus trap), alt text on images.
- Mobile-first: bottom-sticky "Add to cart" on product page, filters in a slide-over sheet, 44px tap targets, test at 360px width.
- Performance: Vite code-splitting per route (`React.lazy`), `loading="lazy"` + fixed aspect ratio on images (no layout shift), debounce search 250 ms, React Query caching, prefetch product on card hover.
- Currency/dates via one helper each (`formatINR`, `Intl.DateTimeFormat('en-IN')`).

### Reusable UI kit (build first, ~half a day)
`Button` (variants/sizes/loading), `Input/Select/Textarea` (with label+error), `Badge`, `Card`, `Modal/Drawer`, `Tabs`, `Table`, `Skeleton`, `EmptyState`, `ErrorState`, `Rating`, `QtyStepper`, `PriceTag`, `Pagination`, `Toast`. Compose pages from these only.

---

## 9. Security checklist

- [ ] `helmet`, strict CORS, `cookie` flags, CSRF-safe design (refresh cookie `SameSite=Lax` + token only used on `/auth/refresh`).
- [ ] Zod validation on **every** body/query/param; strip unknown keys.
- [ ] Prisma only (no raw SQL with interpolation; use `$queryRaw` tagged templates).
- [ ] Ownership enforced in queries (vendors, orders, addresses, invoices).
- [ ] Rate limits: auth, search, checkout.
- [ ] Webhook signature verified on raw body; idempotency ledger.
- [ ] Presigned upload: whitelist MIME + size, random keys, 60 s expiry.
- [ ] No secrets in repo; `.env.example` only; `env.ts` fails fast.
- [ ] Passwords bcrypt; JWT secrets ≥ 32 bytes; refresh tokens hashed at rest.
- [ ] Never log tokens, card data, or full webhook payloads in prod.
- [ ] `npm audit`/`pnpm audit` clean of criticals.

---

## 10. Testing strategy

**Unit (Vitest):** order state machine, commission/discount allocation invariant (property-style loop), coupon validation, money formatting.

**Integration (Supertest + test DB via Docker/testcontainers):**
1. RBAC matrix (customer/vendor/admin × key routes).
2. Vendor A cannot modify vendor B's product/order.
3. Checkout: stock decrement, concurrent last-unit race, coupon limits.
4. Webhook: bad signature → 400; replay → no double effect; captured → Order PAID + payouts created.
5. Expiry job restores stock.
6. Review only after DELIVERED.

**E2E (Playwright, 1–2 specs):** (a) browse → search → add → checkout with `FakeProvider` → see order; (b) vendor creates product → appears in search.

**Manual QA script** (run before demo): fresh DB → seed → run the demo spine from Section 0 on mobile width and desktop.

Target: ≥ 70% coverage on `services/`; CI must be green.

---

## 11. Deployment (FE and BE separately, as required)

| Part | Host (free-friendly) | Notes |
|---|---|---|
| Web | **Vercel** or Netlify | env `VITE_API_URL`; SPA rewrite to `index.html` |
| API | **Render** / Railway / Fly.io (Docker) | health check `/health`; set `NODE_ENV=production`, `WEB_ORIGIN` |
| Postgres | Neon / Supabase / Render PG | run `prisma migrate deploy` on release |
| Redis | Upstash | use TLS URL |
| Elasticsearch | Elastic Cloud trial / Bonsai / **fallback `SEARCH_DRIVER=pg`** | Free hosts often can't run ES — flip the flag and say so honestly in README |
| Images | AWS S3 (+CloudFront optional) | CORS + bucket policy set |

**API Dockerfile (multi-stage)**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages ./packages
RUN corepack enable && pnpm install --frozen-lockfile && pnpm --filter api prisma generate && pnpm --filter api build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app .
USER node
EXPOSE 4000
CMD ["sh","-c","pnpm --filter api prisma migrate deploy && node apps/api/dist/server.js"]
```
**Web:** multi-stage `node:20 build` → `nginx:alpine` serving `dist` with `try_files $uri /index.html`.

Cross-domain cookies: if FE and BE are on different registrable domains, refresh cookie needs `SameSite=None; Secure` and `credentials: true` on both sides. Easiest fix: use a custom domain with subdomains (`app.` and `api.`) — then `SameSite=Lax` works.

**Post-deploy:** set webhook URL in gateway dashboard to the live API; run seed on the hosted DB; verify a real test-mode payment end-to-end.

---

## 12. Environment variables (`.env.example`)

```
NODE_ENV=development
PORT=4000
WEB_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://haat:haat@localhost:5432/haat
REDIS_URL=redis://localhost:6379
SEARCH_DRIVER=es                    # es | pg
ELASTICSEARCH_URL=http://localhost:9200
JWT_ACCESS_SECRET=change-me-32-bytes-min
JWT_REFRESH_SECRET=change-me-32-bytes-min
AWS_REGION=ap-south-1
S3_BUCKET=haat-products
S3_PUBLIC_BASE=https://haat-products.s3.ap-south-1.amazonaws.com
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
PAYMENT_PROVIDER=razorpay           # razorpay | stripe | fake
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
DEFAULT_COMMISSION_BPS=1000
# web
VITE_API_URL=http://localhost:4000/api/v1
VITE_RAZORPAY_KEY_ID=rzp_test_xxx
```

---

## 13. README & submission checklist

Your README is part of the grade. Include:
- [ ] One-paragraph pitch + live links (web, API health) + demo video/GIF (60–90 s of the demo spine).
- [ ] Architecture diagram + ERD + order/payment sequence diagram (Mermaid is fine).
- [ ] "Key decisions & trade-offs" table (Section 1) and the **commission/rounding rule**.
- [ ] Setup in ≤ 5 commands (`cp .env.example .env && docker compose up -d && pnpm i && pnpm db:setup && pnpm dev`).
- [ ] Demo credentials + test card/UPI details.
- [ ] Test instructions + CI badge.
- [ ] Known limitations & what you'd do next (shows maturity): real KYC onboarding, shipping-rate integration, queue (BullMQ) instead of in-process jobs, CDN image resizing, GST invoices, dispute handling.
- [ ] 12+ meaningful commits grouped by phase (Conventional Commits: `feat(orders): …`).

**Demo script (5 minutes):** admin approves vendor → vendor adds product with images → customer searches with a typo → adds items from 2 vendors → coupon → pays with test card → show 2 transfers + commission in gateway dashboard → vendor ships → customer timeline updates → download invoice → leave verified review → admin analytics updates.

---

## 14. Cut list (if you run out of time — drop in this order)

1. Autocomplete suggestions, "More from this vendor", infinite scroll.
2. Vendor-scoped coupons (keep platform-wide only).
3. Playwright E2E (keep API integration tests).
4. Stripe adapter (Razorpay/Fake only).
5. S3 → store images via MinIO locally and S3 only in deploy.
6. Elasticsearch → ship `SEARCH_DRIVER=pg` first, add ES after the core flow works.

**Never cut:** auth + RBAC, checkout transaction with stock safety, webhook-verified payment + split, order lifecycle, tests for those, deploy, README.

---

## 15. Senior-dev working rules

1. **Vertical slices.** Finish one thin end-to-end path (DB → API → UI) before widening. Don't build all APIs, then all UI.
2. **Commit per phase**, run `typecheck + test` before each commit.
3. **Types from one source:** Prisma models + shared Zod schemas; no hand-duplicated interfaces.
4. **Small functions, services own business logic;** controllers only parse/respond.
5. **Fail loudly in dev, safely in prod:** typed errors (`NotFound`, `Conflict`, `Forbidden`) mapped to HTTP in one error handler.
6. **Log with context** (requestId, userId, orderId) — makes payment debugging possible.
7. **When stuck on a gateway API,** read the official docs for the exact current endpoint; don't guess field names.
8. **Time-box:** if any single item eats > half a day, apply the Cut List.

---

### Daily plan (14-day reference)

| Day | Focus |
|---|---|
| 1 | Foundation, docker-compose, schema, ERD, API doc, CI |
| 2 | Auth, RBAC, UI kit started |
| 3–4 | Vendor onboarding, product CRUD, S3 uploads, vendor dashboard |
| 5 | Elasticsearch (+pg fallback), search UI with filters |
| 6–7 | Redis cart, checkout transaction, order lifecycle, vendor/customer order UIs |
| 8–9 | Split payments, webhooks, payouts, refunds |
| 10 | Reviews, coupons, invoices, admin analytics |
| 11 | UI polish, a11y, mobile pass, seed data |
| 12 | Tests, security pass, bug bash |
| 13 | Deploy FE/BE separately, live webhook test |
| 14 | README, demo video, final QA |

Good luck — ship the spine first, polish second.
