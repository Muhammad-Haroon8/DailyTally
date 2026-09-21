# Project Memory & Current State — Daily Tally (Karobar Hisab)

## 1. Current Status

- **Project State**: Production-ready, fully functional full-stack application.
- **Current Version**: `1.1.0` (Android `versionCode: 3`).
- **Live Backend API**: Deployed on Vercel Serverless (`https://daily-tally-theta.vercel.app/api`).
- **Database**: Active MongoDB Atlas cluster connected via Mongoose connection pooling.
- **Mobile Runtime**: Expo SDK `57.0.24`, React Native `0.86.3`, React `19.2.3`.
- **Primary Target**: Android standalone APK built via Expo Application Services (EAS Build).

---

## 2. Completed Features Summary

### 2.1. Dual-Module Ledger System
- **Customer Udhaar (Gahak Hisab)**: Complete credit and payment ledger for shop customers. Supports item credit entries with default catalog rates, cash collection entries (*Wasool Raqam*), running balances, and calendar-month/weekly breakdowns.
- **Wholesaler / Supplier (Saudagar Hisab)**: Full procurement accounting module for wholesale suppliers. Tracks goods purchased, direct payments, advance payments, and running net debt (*Baqi Baqaya*).

### 2.2. Complex Delivery & Advance Accounting
- **Simultaneous Extra & Shortage Items**: `AddPurchaseEntryScreen` allows adding multiple extra items delivered and multiple shortage items (*kam aaya*) in a single delivery, with automated server-side recalculation of net bill amounts.
- **Dedicated Advance Pool**: Disburses and tracks advance payments in a distinct supplier fund pool.
- **Weekly Advance Settlement ("Advance Se Katein")**: Settles weekly delivery bills against the supplier's accumulated advance pool directly from `WholesalerWeekDetailScreen` with strict server-side validation preventing overdrawn advances.

### 2.3. Hierarchical Ledger Browsing
- Both customer and wholesaler ledgers are organized into a clean 3-level hierarchy:
  1. **Main Entity Screen**: Lifetime net balance and active Month Cards with opening/closing balances.
  2. **Month Detail Screen**: Monthly summary card and Week Cards (Week 1 through Week 5).
  3. **Week Detail Screen**: Weekly opening balance, chronological daily transaction cards with color badges, and closing balance.

### 2.4. Bilingual PDF Statements & Native Sharing
- Backend `pdfReportService.js` creates vector A4 statement sheets with embedded Unicode `Arial` fonts.
- Includes shop name, entity details, opening balance, debit/credit ledger table with sub-item breakdowns, summary cards, and closing balance.
- 1-tap scoped exports directly from Month and Week screens.
- Triggers native OS share sheet (`expo-sharing`) for instant dispatch via WhatsApp.

### 2.5. Resilient Offline-First Architecture
- **Custom FileSystem Storage Adapter**: Eliminates the common Expo Go `"Native module is null"` error by persisting data into sandboxed JSON files via `expo-file-system/legacy`.
- **Instant Local Cache**: Renders customer lists, wholesaler lists, item catalogs, and transaction ledgers from local storage in `< 50ms`.
- **Persistent Offline Queue**: Queues write operations when offline and executes sequential background sync with ID remapping upon reconnection.
- **Network Status Banner**: Persistent indicator notifying user of offline state and pending sync count.

### 2.6. Customer Self-Service Portal (Read-Only)
- **Phone-Only Authentication**: Customers log in with their registered phone number (no OTP/password required in v1.1.0). Includes multi-shop picker disambiguation if a phone number exists across multiple shops.
- **Dedicated Dual-Token Architecture**: Customer session issues a specialized JWT with `tokenType: "customer"`, saved under `customerAuthToken` in `expo-secure-store`. Staff endpoints strictly reject customer tokens with HTTP 403 at the middleware level.
- **Non-Technical & Low-Literacy Redesign**:
  - `CustomerLoginScreen`: Simplified to friendly receipt icon (`🧾`), large 20px numeric input (`Apna Mobile Number Likhein` with `0300 1234567` placeholder), one prominent button (`Apna Hisab Dekhein →`), warm error messages, and direct back link.
  - `CustomerPortalHomeScreen`: Restored month-wise organization! Shows arm's-length 42px bold hero balance (`Baqi Baqaya`), plain status banner, clear secondary context (`Kitna Samaan Liya` vs `Kitne Paise Diye`), prominent all-time PDF statement button, and clean Month Cards list (most recent first, only months with data) navigating into `CustomerPortalMonthDetailScreen`.
  - `CustomerPortalMonthDetailScreen`: Displays monthly summary card, Thursday-to-Wednesday weekly summary cards navigating to `CustomerPortalWeekDetailScreen`, and month day-wise transactions list in paper-receipt styling with individual month PDF download.
  - `CustomerPortalWeekDetailScreen`: Week summary card with Thursday-to-Wednesday date range, Kitna Liya / Kitna Diya / Net totals, week PDF download, and paper-receipt transaction list.
- **Strictly Non-Destructive**: Zero add, edit, or delete buttons anywhere in the customer experience.

### 2.7. Super Admin Platform Oversight, Soft-Delete & Audit System (Phase 12)
- **Separate SuperAdmin Collection & Out-of-Band Provisioning**: Dedicated `SuperAdmin` collection strictly separate from `User`. Initial account provisioned via terminal CLI `node backend/scripts/createSuperAdmin.js`.
- **Triple-Token Security Boundary**: Enforces strict mutual exclusivity across staff (`{ userId }`), customer (`{ tokenType: "customer" }`), and super admin (`{ tokenType: "superadmin" }`) sessions with HTTP 403 barriers.
- **Universal Soft-Delete Architecture**: Zero physical document deletions across `Customer`, `Item`, `Entry`, `Wholesaler`, `WholesalerItem`, and `WholesalerEntry`. All deletions mark `isDeleted: true`, `deletedAt`, `deletedBy: req.userId` with identical response shapes for client compatibility.
- **Permanent Immutable Audit Log**: Captures complete document state snapshot (`entitySnapshot`) at the exact moment of deletion in `AuditLog`.
- **Read-Only Oversight Endpoints**: Cross-shop visibility for shops overview with counts, shop-level customer/wholesaler lists (revealing deleted records), detailed entity histories, and filtered audit log inspection.

---

## 3. In Progress & Recent Fixes

- **Super Admin & Soft-Delete Backend Verification**: Created automated test suite `backend/scripts/testSuperAdminScenario.js` confirming 100% compliance with soft-delete, audit snapshots, cross-shop visibility, and triple-token 403 boundaries.
- **Express Route Ordering Optimization**: Ensured `/api/super-admin` is registered prior to generic `/api` middleware mounts in `server.js` to preserve clean route evaluation.
- **Dynamic Navigator Routing Fix (`AppNavigator.js`)**: Fixed an issue where `initialRouteName="Home"` was hardcoded, causing a crash (`Couldn't find a screen named 'Home'`) for unauthenticated users. Configured dynamic initial routing: `initialRouteName={isAuthenticated ? 'Home' : 'Login'}`.
- **Expo SDK 57 Dependency Alignment**: Updated `expo` to `~57.0.24`, `expo-file-system` to `~57.0.7`, `expo-secure-store` to `~57.0.4`, and `expo-sharing` to `~57.0.21` using `npx expo install --fix`.
- **Vercel Serverless Font Bundling**: Configured root `vercel.json` with `includeFiles` targeting `backend/fonts/**` and `backend/node_modules/pdfkit/**` so PDFKit can locate TTF files in serverless AWS Lambda environments.
- **DateTimePicker Dismissal Handling**: Removed deprecated `onChange` syntax in favor of conditional event handling (`event.type === 'set'`) to prevent LogBox warnings across all entry screens.

---

## 4. Known Issues & Limitations

1. **Single-Device Assumption**:
   - The offline action queue does not implement multi-device Conflict-Free Replicated Data Types (CRDTs). The application assumes a single primary shopkeeper device per account. If multiple devices perform offline edits concurrently on the same account, last-write-wins applies.
2. **Wholesaler Purchase Offline Sync**:
   - Simple entries (customer items, payments, customer creation) sync seamlessly via the offline queue. However, complex wholesale purchases containing multiple dynamic sub-item adjustments require an active network connection for server verification.
3. **Expo CLI Login Prompt in Dev**:
   - When launching `expo start` interactively, Expo CLI may prompt for an Expo account login. Developers can bypass this by pressing the Down Arrow key to select *"Proceed anonymously / Continue without logging in"* or by executing `npx expo login` once.

---

## 5. Key Decisions Log

| Decision | Context & Alternative | Rationale / Outcome |
|---|---|---|
| **MongoDB Atlas over SQL** | Relational DBs (PostgreSQL/MySQL) vs Document DB | Wholesale deliveries require flexible subdocument arrays (`extraItems`, `shortageItems`) that vary per shipment without needing complex join tables. MongoDB aggregation pipelines also simplify calendar-month grouping. |
| **Custom FileSystem Storage over `@react-native-async-storage`** | Standard AsyncStorage package | In Expo SDK 54+ and 57 in Expo Go, AsyncStorage frequently crashes with `"Native module is null"`. Replacing it with `expo-file-system/legacy` reading/writing JSON files in `documentDirectory` provides 100% stability across all development and production builds. |
| **Server-Side Financial Authority** | Client-side total calculation | Never trust client devices for financial arithmetic. Floating-point errors and manipulated payloads could corrupt shop records. The server strictly recalculates `quantity * rate` and `base + extra - shortage`. |
| **Advance Settlement on Week Detail Screen** | Settling advance globally on Customer/Wholesaler screen | In wholesale meat and produce trading, settlement happens strictly on weekly billing cycles. Merchants tally the week's deliveries and then deduct a portion of the advance against that specific week's bill. |
| **Roman Urdu Domain Terminology** | Standard English accounting terms (Accounts Receivable/Payable) | The target users are Pakistani shopkeepers and small traders. Terms like *Gahak*, *Udhaar*, *Wasool*, *Saudagar*, *Kharedari*, *Adaigi*, and *Baqi Baqaya* are intuitively understood without accounting training. |
| **WhatsApp PDF Sharing via Native Share Sheet** | Automated SMS Gateway or direct WhatsApp Business API | Third-party SMS and WhatsApp Business APIs carry recurring monthly costs and per-message fees. Using `expo-sharing` to launch the device's native WhatsApp share sheet provides a free, familiar, and highly reliable workflow. |
| **Phone-Only Customer Portal Login (No Password/OTP)** | SMS OTP or customer password setup | Customers of local meat/grocery shops frequently forget passwords and SMS gateways introduce recurring costs. Phone-only login with IP rate-limiting and strictly read-only scoped endpoints enables zero-friction hisab transparency. |
| **Dual-Token Boundary (`tokenType: customer`)** | Shared user role or token payload | Customer tokens must never be capable of calling staff endpoints. Creating a distinct token payload and enforcing a hard 403 barrier in staff `authMiddleware` guarantees complete tenant protection even without passwords. |
| **Thursday-to-Wednesday Trading Week (Everywhere)** | Monday-start or day-of-month (1-7, 8-14) weeks | Local market business cycle runs Thursday through Wednesday. Implemented via centralized `weekBoundaries.js` engine across all 6 screens (Customer staff, Wholesaler staff, Customer Portal). |
| **Customer Portal Month + Week Structure** | Flat continuous timeline | Retained clear hierarchical browsing (Home Month Cards -> MonthDetail -> WeekDetail) with big typography, paper-receipt styling, and zero filter chips. |
| **Separate SuperAdmin Collection vs Role on User** | Boolean `isSuperAdmin` on `User` | Complete physical separation of administrative privileges prevents privilege escalation, simplifies permission reasoning, and avoids accidental data exposure. |
| **Soft-Deletes with Immutable Audit Snapshots** | Hard MongoDB deletion | Eliminates accidental data loss. When shopkeepers delete records, they disappear from the shop view but remain available to Super Admin with the actor and full snapshot preserved. |
| **Triple-Token Mutual Exclusivity** | Single token with claims | Staff (`{ userId }`), Customer (`tokenType: customer`), and Super Admin (`tokenType: superadmin`) cannot call across boundaries; each middleware rejects other types with HTTP 403. |
| **Super Admin Web Dashboard Stack & Animation Division** | Single monolithic UI or vanilla CSS | Built as independent Next.js 14 App Router project in `/admin-web` using strict TypeScript. Clear animation division: Framer Motion exclusively for UI, dialogs, route transitions; GSAP strictly for numerical counter interpolation on KPI metric cards. SCSS modules handle delicate table styling (soft-delete red tinting, strikethrough) and nested snapshot JSON trees. |

---

## 6. Environment & Deployment Information

### Environment Variables Reference

#### Backend (`backend/.env`)
- `PORT`: Local server port (e.g., `5000`).
- `MONGODB_URI`: MongoDB Atlas connection URI string.
- `JWT_SECRET`: 256-bit secret string for signing JWT session tokens.
- `NODE_ENV`: Server environment mode (`development` or `production`).

#### Mobile (`mobile/.env`)
- `API_BASE_URL`: Base URL for local testing (`http://<LOCAL_IP>:5000/api`).
- `EXPO_PUBLIC_API_BASE_URL`: Production backend endpoint (`https://daily-tally-theta.vercel.app/api`).

#### Super Admin Web (`admin-web/.env.local`)
- `NEXT_PUBLIC_API_URL`: Backend REST API URL (`http://localhost:5000/api` locally, or `https://daily-tally-theta.vercel.app/api` in production).

### Running the Local Development Environment

1. **Start Backend Server**:
   ```powershell
   cd backend
   npm run dev
   # Runs nodemon server.js on port 5000
   ```

2. **Start Mobile App**:
   ```powershell
   cd mobile
   npm start
   # Starts Expo Metro bundler
   ```
   - Press **`a`** to open in Android Emulator.
   - Scan the terminal QR code with the **Expo Go** app on a physical device.

3. **Start Super Admin Web Dashboard**:
   ```powershell
   cd admin-web
   npm run dev
   # Runs Next.js 14 dev server on http://localhost:3000
   ```
   - Super Admin Login: `admin@dailytally.com` / `SuperSecret123`.

---

## 7. Next Steps & Roadmap

1. **Bluetooth Thermal Receipt Printing**:
   - Implement direct ESC/POS mobile printing via Bluetooth to generate physical paper receipts at the shop checkout counter.
2. **Customer WhatsApp Automated Reminders**:
   - Provide pre-formatted WhatsApp text message templates with customer name, outstanding balance, and bank details for fast bill reminders.
3. **Multi-Shop Management**:
   - Allow a single user login to toggle between multiple shops (e.g., Shop A - Retail, Shop B - Wholesale).
