# Project Phases & Tasks — Daily Tally (Karobar Hisab)

This document reconstructs the actual development history of Daily Tally as recorded across git commits, release changelogs, and codebase architecture.

---

## Phase 0 — Project Setup & Monorepo Foundation
Status: ✅ Complete
- [x] Initialize Git repository and directory structure (`/backend` and `/mobile`).
- [x] Configure Express.js server boilerplate with CORS, JSON body parser, and Dotenv support.
- [x] Establish MongoDB Atlas M0 cluster connection via Mongoose with connection pooling in `config/db.js`.
- [x] Scaffold React Native application using Expo SDK (`~57.x`).
- [x] Set up central design system tokens in `mobile/src/constants/theme.js`.
- [x] Configure EAS Build manifest (`eas.json`) targeting Android standalone APKs.

---

## Phase 1 — Authentication & Shopkeeper Accounts
Status: ✅ Complete
- [x] Implement Mongoose `User` model with email uniqueness, phone, and bcrypt password hashing.
- [x] Create backend `authController.js` with registration, login, profile fetch, profile update, and password change endpoints.
- [x] Implement JWT token signing and verify via `authMiddleware.js`.
- [x] Build mobile `LoginScreen.js` and `SignupScreen.js` with toggleable password visibility (`EyeIcon.js`).
- [x] Implement `AuthContext.js` using `expo-secure-store` for persistent session management.
- [x] Configure Axios client with automatic Bearer token injection and global 401 unauthorized session expiry handling.
- [x] Fix signup flow to redirect to login and prefill registered email.

---

## Phase 2 — Customer Udhaar Management
Status: ✅ Complete
- [x] Implement `Customer` Mongoose model scoped strictly to `userId`.
- [x] Create `customerController.js` with customer creation, alphabetical listing, and search filtering.
- [x] Implement MongoDB aggregation pipeline to compute real-time customer balances (`totalUdhaar`, `totalWasool`, `balance`).
- [x] Build `DashboardScreen.js` displaying customer list with search bar, net debt badges, and floating action button.
- [x] Build `AddEditCustomerScreen.js` for creating new customers and updating names and contact details.

---

## Phase 3 — Item Master Catalog
Status: ✅ Complete
- [x] Implement `Item` Mongoose schema with `name` and `defaultRate` scoped to `userId`.
- [x] Create CRUD endpoints in `itemController.js` and `itemRoutes.js`.
- [x] Build `ManageItemsScreen.js` displaying all master items with unit rates.
- [x] Build `AddEditItemScreen.js` to define and modify master item rates.
- [x] Create `ItemDropdown.js` reusable component for instant item selection in transaction forms.

---

## Phase 4 — Daily Credit & Payment Entries
Status: ✅ Complete
- [x] Implement `Entry` Mongoose schema supporting `item` (Udhaar) and `payment` (Wasool) types.
- [x] Create compound database index `{ customerId: 1, entryDate: 1 }` for optimized chronological queries.
- [x] Implement server-side recalculation of entry amounts (`quantity * rate`) in `entryController.js`.
- [x] Build `AddItemEntryScreen.js` with item picker, quantity, rate, calculation preview, date/time pickers, and notes.
- [x] Build `AddPaymentEntryScreen.js` for recording cash receipts with notes and timestamps.
- [x] Implement entry edit and delete endpoints with cascading recalculation.

---

## Phase 5 — Hierarchical Monthly & Weekly Ledger UI
Status: ✅ Complete
- [x] Transform customer transaction list into structured calendar months with opening and closing balances.
- [x] Build `CustomerDetailScreen.js` showing lifetime balance and vertical stack of active Month Cards.
- [x] Build dedicated `MonthDetailScreen.js` displaying monthly totals and weekly summary cards (Week 1 to Week 5).
- [x] Build dedicated `WeekDetailScreen.js` showing weekly opening balance, chronological daily entry cards, and week closing balance.
- [x] Add segmented `EntryTypeFilter.js` to filter entries by type (All / Udhaar / Wasool).
- [x] Fix DateTimePicker event handling across all entry forms to eliminate Android LogBox warnings.

---

## Phase 6 — PDF Reports & Unicode Font Generation
Status: ✅ Complete
- [x] Implement backend `pdfReportService.js` using `pdfkit` to generate structured A4 ledger statements.
- [x] Embed Unicode `arial.ttf` and `arialbd.ttf` fonts to safely render Urdu/Arabic characters and business names.
- [x] Implement `reportController.js` calculating pre-range opening balances and streaming PDF buffers.
- [x] Bundle font files and `pdfkit` modules in root `vercel.json` for Vercel serverless execution.
- [x] Build `SendReportModal.js` supporting predefined date ranges ("Is Hafte Ka", "Is Mahine Ka", "Custom Range").
- [x] Integrate `expo-sharing` with `expo-file-system/legacy` to download and open native OS share sheets for WhatsApp dispatch.
- [x] Add 1-tap scoped "Report Bhejein" buttons directly into `MonthDetailScreen` and `WeekDetailScreen`.

---

## Phase 7 — Complete Offline Support & Action Queue
Status: ✅ Complete
- [x] Implement custom `storageAdapter.js` using `expo-file-system/legacy` JSON files to eliminate Expo Go AsyncStorage null errors.
- [x] Create `localCache.js` layer for caching customers, items, and hierarchical monthly ledgers.
- [x] Implement persistent FIFO action queue in `offlineQueue.js` with temporary local IDs.
- [x] Build temporary-to-MongoDB ID remapping logic (`remapQueueIds`) to maintain relational integrity when syncing queued records.
- [x] Implement `NetworkContext.js` monitoring NetInfo state and automatically triggering background queue flushes.
- [x] Build global `NetworkStatusBanner.js` displaying offline status and pending sync count.

---

## Phase 8 — Wholesaler / Supplier Module
Status: ✅ Complete
- [x] Implement `Wholesaler` Mongoose model scoped to `userId`.
- [x] Create `wholesalerController.js` with aggregation calculating `totalKharedari`, `totalPayment`, and `baqiBaqaya`.
- [x] Implement separate `WholesalerItem` catalog schema for procurement goods.
- [x] Build `WholesalerListScreen.js` with supplier search and net balance metrics.
- [x] Build `WholesalerDetailScreen.js` with lifetime totals, monthly breakdown cards, and action buttons.
- [x] Build `WholesalerMonthDetailScreen.js` and `WholesalerWeekDetailScreen.js`.
- [x] Update `HomeScreen.js` and navigation to feature prominent "Wholesaler (Saudagar)" entry point.

---

## Phase 9 — Complex Deliveries, Advance Pool & Settlements
Status: ✅ Complete
- [x] Implement `WholesalerEntry` schema with support for `purchase`, `payment`, `advance`, and `advanceSettlement`.
- [x] Build `AddPurchaseEntryScreen.js` with multi-item Extra Delivery (+ button) and multi-item Shortage (*Kam Aaya*) adjustments.
- [x] Build `AddWholesalerAdvanceScreen.js` ("Advance Dein") to track funds disbursed into the supplier's advance pool.
- [x] Implement "Advance Se Katein" modal in `WholesalerWeekDetailScreen` to settle weekly delivery bills against the advance pool.
- [x] Enforce server-side advance pool validation to prevent deductions exceeding remaining advance funds.
- [x] Implement `wholesalerReportController.js` and `WholesalerSendReportModal.js` with advance tracking sections in PDF statements.
- [x] Add offline caching for wholesaler lists, items, and summaries in `localCache.js`.

---

## Phase 10 — Production Polish, Bug Fixes & v1.1.0 Release
Status: ✅ Complete
- [x] Fix date/time picker selection in "Advance Se Katein" modal so deductions correctly attach to selected weeks.
- [x] Enable editing and deletion of advance deduction entries from week and month detail screens.
- [x] Unlink Extra and Shortage sections in `AddPurchaseEntryScreen` so both can be logged simultaneously in a single delivery.
- [x] Resolve empty state cache synchronization bug in customer `WeekDetailScreen`.
- [x] Fix `AppNavigator.js` unauthenticated crash by dynamically evaluating `initialRouteName` (`isAuthenticated ? 'Home' : 'Login'`).
- [x] Bump application version to `1.1.0` (Android `versionCode: 3`) in `mobile/app.json` and update `CHANGELOG.md`.

---

## Phase 11 — Customer Self-Service Portal
Status: ✅ Complete
- [x] Implement backend `customerAuthController.js` (`POST /api/customer-auth/login`) with phone normalization, multi-shop disambiguation, rate limiting, and dedicated `tokenType: "customer"` JWT issuance.
- [x] Implement backend `customerAuthMiddleware.js` enforcing `tokenType: "customer"` and extracting `req.customerId`.
- [x] Implement read-only endpoints in `customerPortalController.js` and `customerPortalRoutes.js` (`GET /api/customer-portal/me`, `GET /api/customer-portal/entries`, `GET /api/customer-portal/report/pdf`).
- [x] Enforce security barrier in staff `authMiddleware.js` rejecting customer tokens with HTTP 403.
- [x] Add "Customer Hain? Apna Hisab Dekhein" entry point to mobile `LoginScreen.js`.
- [x] Create `CustomerLoginScreen.js` for single or multi-shop customer phone login with dedicated SecureStore key (`customerAuthToken`).
- [x] Create isolated `CustomerAuthContext.js` and `useCustomerAuth()` hook.
- [x] Build `CustomerPortalHomeScreen.js` with customer greeting, official bank-statement style lifetime totals card, month list, and logout.
- [x] Build read-only `CustomerPortalMonthDetailScreen.js` and `CustomerPortalWeekDetailScreen.js` with zero add/edit/delete affordances and optional PDF download.
- [x] Update root navigation logic to cleanly support 3 mutually exclusive states (Logged out, Staff, Customer).

---

## Phase 12 — Super Admin Platform Oversight, Soft-Delete & Audit Logging
Status: ✅ Complete
- [x] Create isolated `SuperAdmin` Mongoose model (`models/SuperAdmin.js`) with dedicated email uniqueness and bcrypt password hash.
- [x] Implement backend `superAdminAuthController.js` (`POST /api/super-admin/login`) issuing JWT with payload `{ superAdminId, tokenType: "superadmin" }`.
- [x] Create one-time CLI provisioning script `backend/scripts/createSuperAdmin.js` for initial Super Admin creation.
- [x] Implement backend `superAdminMiddleware.js` enforcing `tokenType: "superadmin"` and extracting `req.superAdminId`.
- [x] Enforce triple-token boundary in `authMiddleware.js` and `customerAuthMiddleware.js`, rejecting cross-access with HTTP 403.
- [x] Implement immutable `AuditLog` Mongoose model (`models/AuditLog.js`) capturing full document snapshots, actors, and timestamps.
- [x] Add soft-delete fields (`isDeleted`, `deletedAt`, `deletedBy`) across all models: `Customer`, `Item`, `Entry`, `Wholesaler`, `WholesalerItem`, `WholesalerEntry`, and `User`.
- [x] Convert all existing delete operations to soft-deletes with AuditLog recording (`customerController.js`, `itemController.js`, `entryController.js`, `wholesalerController.js`, `wholesalerItemController.js`, `wholesalerEntryController.js`).
- [x] Cascade soft-delete active entries upon Wholesaler deletion.
- [x] Audit and update all shop-facing queries, aggregations, balance calculations, and PDF reports (`reportController.js`, `wholesalerReportController.js`, `customerPortalController.js`) to filter `isDeleted: { $ne: true }`.
- [x] Implement read-only Super Admin endpoints in `superAdminController.js` and `superAdminRoutes.js`:
  - `GET /api/super-admin/shops` (list all shops with owner details and active/deleted counts)
  - `GET /api/super-admin/shops/:shopId/customers` (list all shop customers including deleted records with lifetime totals)
  - `GET /api/super-admin/customers/:customerId` (cross-shop full customer entry history with deleted flags)
  - `GET /api/super-admin/shops/:shopId/wholesalers` (list all shop wholesalers including deleted records with lifetime totals)
  - `GET /api/super-admin/wholesalers/:wholesalerId` (cross-shop full wholesaler entry history with deleted flags)
  - `GET /api/super-admin/audit-log` (filter audit logs by shopId, userId, entityType, date range)
  - `GET /api/super-admin/audit-log/:entityId` (full audit history for a single entity)
- [x] Build and run automated end-to-end test suite (`backend/scripts/testSuperAdminScenario.js`).
- [x] **Part B: Super Admin Web Dashboard (`/admin-web`)**:
  - [x] Built Next.js 14 (App Router, React 18) application with TypeScript throughout (`.tsx`/`.ts`) and strict interfaces (`types/superAdmin.ts`).
  - [x] Implemented styling using Tailwind CSS + SCSS modules (`tables.module.scss`, `snapshot.module.scss`, `_variables.scss`, `globals.scss`).
  - [x] Implemented animations: Framer Motion for modals/transitions and GSAP for numerical count-up interpolation on KPI metric cards.
  - [x] Built Super Admin login page (`/login`) with glassmorphism UI, token persistence in `localStorage`, Bearer authorization, and 401 session auto-logout.
  - [x] Built Shops Directory (`/shops`) with platform KPI cards (total shops, customers, preserved soft-deletions, wholesalers) and instant search.
  - [x] Built Shop Ledgers view (`/shops/[shopId]`) with tabbed Customer & Wholesaler lists, soft-delete red tinting, and deletion attribution.
  - [x] Built Customer Full Ledger view (`/customers/[customerId]`) with lifetime totals, soft-deleted transaction strikethrough, and audit history link.
  - [x] Built Wholesaler Full Ledger view (`/wholesalers/[wholesalerId]`) with purchase/payment/advance metrics, extra/shortage breakdowns, and audit metadata.
  - [x] Built Platform Audit Trail (`/audit-log`) with filtering by entity type, action, date range, entity ID, and interactive `SnapshotModal` (tree view + raw JSON with copy).
  - [x] Validated production build (`npm run build`) with zero TypeScript errors across all routes.

---

## Phase 13 — Future Planned Enhancements
Status: 🔲 Not Started / Planned
- [ ] **Direct Thermal POS Printing**: Add Bluetooth ESC/POS printer support for instant paper receipts at the shop counter.
- [ ] **Multi-Shop Account Switching**: Allow a single shopkeeper account to manage multiple branches or independent shops.
- [ ] **Customer WhatsApp Notification Bot**: Automated reminder messages dispatched on bill closing days.
- [ ] **Staff / Cashier Permission Roles**: Add read-only or entry-only access roles for shop helpers.
- [ ] **Inventory & Stock Tracking**: Track remaining live stock deduced from supplier purchases and customer sales.


