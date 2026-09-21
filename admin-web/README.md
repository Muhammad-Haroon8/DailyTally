# Daily Tally — Super Admin Web Dashboard

A platform-level oversight web portal built for Daily Tally. Allows super administrators to inspect all shops, audit customer and wholesaler ledgers, review preserved soft-deleted records with inline attribution, and search/filter platform-wide audit logs with interactive snapshot inspection.

---

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router, React 18)
- **Language**: TypeScript (`.tsx`/`.ts`) throughout with zero `any`
- **Styling**: Tailwind CSS + SCSS Modules (`tables.module.scss`, `snapshot.module.scss`, `_variables.scss`, `globals.scss`)
- **Animations**:
  - **Framer Motion**: Page transitions, dialog backdrop blurs, snapshot modal drawers, animated tabs, hover micro-interactions
  - **GSAP**: Numerical count-up animations on KPI metric cards (`gsap.to()` with number interpolation)
- **Icons**: Lucide React

---

## 📦 Directory Structure

```
/admin-web
├── app/
│   ├── (dashboard)/
│   │   ├── audit-log/page.tsx          # Platform audit trail with snapshot inspector
│   │   ├── customers/[customerId]/     # Full customer ledger history
│   │   ├── layout.tsx                  # Protected dashboard shell & auth guard
│   │   ├── shops/page.tsx              # Shops directory with platform KPI cards
│   │   ├── shops/[shopId]/page.tsx     # Shop details, customer & wholesaler ledgers
│   │   └── wholesalers/[wholesalerId]/ # Full wholesaler ledger history
│   ├── login/page.tsx                  # Super Admin glassmorphism login screen
│   ├── layout.tsx                      # Root layout with AuthProvider & styles
│   └── page.tsx                        # Root redirect (/ -> /shops or /login)
├── components/
│   ├── Header.tsx                      # Header with breadcrumbs & action buttons
│   ├── MetricCard.tsx                  # KPI card with GSAP count-up number interpolation
│   ├── Sidebar.tsx                     # Dark navigation sidebar with active link indicator
│   ├── SkeletonTable.tsx               # Shimmer table placeholder
│   ├── SnapshotModal.tsx               # Framer Motion modal with tree view & raw JSON
│   └── StatusBadge.tsx                 # Active vs Soft-Deleted indicator with attribution
├── context/
│   └── AuthContext.tsx                 # Super Admin auth state, token storage & session handling
├── lib/
│   ├── apiClient.ts                    # Typed fetch client with automatic Bearer token injection
│   └── formatters.ts                   # Currency, date, and time utilities
├── styles/
│   ├── _variables.scss                 # SCSS design tokens (colors, radii, fonts)
│   ├── globals.scss                    # Tailwind directives & global resets
│   ├── tables.module.scss              # Custom table styling with soft-delete red tint/strikethrough
│   └── snapshot.module.scss            # Formatted snapshot key-value tree viewer
└── types/
    └── superAdmin.ts                   # Strict TypeScript interfaces matching backend responses
```

---

## 🔑 Authentication

- **Default Super Admin Email**: `admin@dailytally.com`
- **Default Password**: `SuperSecret123`
- Tokens are stored in browser `localStorage` as `superAdminToken` and automatically injected into every request as `Authorization: Bearer <token>`.
- Any `401` or `403` status automatically clears credentials and redirects the user to `/login?expired=true`.

---

## 💻 Local Development

1. **Install dependencies**:
   ```bash
   cd admin-web
   npm install
   ```

2. **Configure environment**:
   Check `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

3. **Start Next.js dev server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Compile production build & check types**:
   ```bash
   npm run build
   ```

---

## ☁️ Vercel Deployment

Deploying `/admin-web` as a dedicated project on Vercel:

1. **From Vercel Dashboard**:
   - Import repository: `DailyTally`
   - Set **Root Directory** to `admin-web`
   - Framework preset: **Next.js**
   - Add Environment Variable:
     - `NEXT_PUBLIC_API_URL`: `https://daily-tally-theta.vercel.app/api`
   - Click **Deploy**.

2. **From Vercel CLI**:
   ```bash
   cd admin-web
   vercel --prod
   ```
