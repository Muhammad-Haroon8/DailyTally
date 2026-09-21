# Product Requirements Document (PRD) — Daily Tally (Karobar Hisab)

## 1. Product Overview
**Daily Tally** (also referred to in the codebase as **Karobar Hisab**) is a production-grade, offline-first mobile accounting and ledger application designed for retail and wholesale merchants (specifically daily trading and meat shop businesses). It enables shopkeepers to track two parallel financial streams: customer credit accounts (**Customer Udhaar / Gahak Hisab**) and supplier/vendor procurement accounts (**Wholesaler / Saudagar Hisab**). The system eliminates paper ledger diaries by automating running balances, weekly and monthly settlement summaries, complex delivery adjustments (extra and shortage items), advance payment pools, and 1-tap PDF statement sharing via WhatsApp.

---

## 2. Problem Statement
Small-to-medium retail and wholesale shop owners (e.g., meat butchers, daily perishables merchants, grocery wholesalers) face severe operational friction when managing transactions manually:
- **Paper Ledger Vulnerability**: Handwritten diaries (*khatas*) are prone to damage, loss, illegible handwriting, and tampering.
- **Calculation Errors in Credit & Wasool**: Manually recalculating running debts across weeks and months creates mathematical errors and customer distrust.
- **Wholesale Delivery Complexity**: Perishable and wholesale deliveries rarely match initial invoices exactly. Shipments arrive with **extra pieces** or **shortages (kam aaya)** that must be factored into the bill immediately. Paper books fail to track these adjustments accurately.
- **Advance Payment Tracking (Advance Pool)**: Merchants often advance large lump sums to suppliers/farmers days or weeks ahead. Reconciling which portion of an advance was deducted from which weekly delivery bill is a constant source of disputes.
- **Challenging Shop Environments**: Spotty internet connectivity in markets requires instant offline data access, while customers demand clear, verifiable statements via WhatsApp.

---

## 3. Goals
- **100% Mathematical Accuracy**: Guarantee zero rounding or calculation discrepancies across customer credits, wholesale purchases, and supplier advances through server-enforced calculations.
- **Real-Time Visibility**: Allow merchants to view net debt (`baqi baqaya`) and cash received (`wasool raqam`) for any customer or supplier in under one second.
- **Structured Settlement Cycles**: Organize transactions into natural calendar months and weekly billing periods (Week 1 to Week 5) matching real market practices.
- **Instant Dispute Resolution**: Generate and share bilingual, professional PDF account statements directly through WhatsApp in a single tap.
- **Continuous Offline Operation**: Allow shopkeepers to view customer profiles, items, and historical ledgers even during network outages.

---

## 4. Target Users
- **Primary User**: Traditional retail/wholesale merchants, shopkeepers, and sole proprietors in Pakistan/South Asia (initially built specifically for the developer's family meat business — evidenced by default dashboard greetings like `"Papa"` and specialized item catalogs like `"Siri, Jore"`).
- **Language & Cultural Context**: Users comfortable with Roman Urdu accounting terminology (*Gahak*, *Udhaar*, *Wasool*, *Saudagar*, *Kharedari*, *Adaigi*, *Baqi Baqaya*, *Advance Katoti*).
- **Technical Literacy**: Non-technical or semi-technical operators who require big touch targets, intuitive visual badges (Emerald for neutral, Amber for credit/kharedari, Green for payments, Red for debt), and zero complicated accounting jargon like standard double-entry debits/credits.

---

## 5. Core Features

### 5.1. Authentication & Security
- **Multi-Tenant User Accounts**: Secure email and password registration and login.
- **Session Persistence**: Encrypted JWT storage via `expo-secure-store`.
- **Profile Management**: Profile viewer, name and phone updates, and secure password modification (with email kept strictly immutable).
- **Auto-Logout on Expiry**: Automatic interceptor detection of expired JWT sessions with user alert and navigation reset.

### 5.2. Customer Udhaar Ledger (Gahak Hisab)
- **Customer Directory**: Add, edit, and search customers with alphabetical sorting and real-time net balance indicators.
- **Item Master Catalog**: Manage reusable customer items with pre-configured default unit rates for rapid entry creation.
- **Transaction Types**:
  - **Item / Udhaar Entry**: Date, time, item selection, quantity, rate, automated amount (`quantity * rate`), and optional notes.
  - **Payment / Wasool Raqam Entry**: Date, time, cash collected, and notes.
- **Hierarchical Ledger Navigation**:
  - **Customer Screen**: Total lifetime balance and list of active month cards (newest first).
  - **Month Detail Screen**: Opening balance, monthly net change, closing balance, and weekly summary cards.
  - **Week Detail Screen**: Opening balance for the week, chronological daily entry cards, and closing balance.
- **Entry Manipulation**: Edit or delete past entries with automatic cascading recalculation of running and closing balances.

### 5.3. Wholesaler / Supplier Ledger (Saudagar Hisab)
- **Wholesaler Directory**: Maintain supplier profiles with total purchases (*kul kharedari*), payments (*adaigi*), net balance (*baqi baqaya*), and remaining advance pool (*advance baqi*).
- **Wholesaler Item Catalog**: Independent catalog of wholesale goods with default procurement rates.
- **Complex Purchase Entry (`AddPurchaseEntryScreen`)**:
  - **Base Purchase**: Main item, quantity, rate, and base amount.
  - **Multi-Item Extra Deliveries**: Add multiple extra items (+ button) specifying pieces and rates, automatically added to the bill.
  - **Multi-Item Shortages (*Kam Aaya*)**: Add multiple shortage items specifying pieces and rates, automatically deducted from the bill.
  - **Net Purchase Calculation**: Server-enforced calculation: `Base + Extra - Shortage`.
- **Supplier Payment Entry**: Direct cash or bank payments disbursed to wholesalers.
- **Advance Payment Pool & Settlement**:
  - **Advance Entry ("Advance Dein")**: Disburse lump-sum advances stored in a dedicated pool.
  - **Advance Settlement ("Advance Se Katein")**: Deduct portions of the accumulated advance from weekly purchase bills, with date/time pickers and server-side validation preventing deductions exceeding the available pool.

### 5.4. PDF Statement Generation & Native Sharing
- **Bilingual & Professional Layout**: Generates clean A4 ledger statements via backend `PDFKit`.
- **Embedded Unicode Typography**: Bundles Unicode `Arial` and `Arial Bold` fonts to safely render bilingual text and shop names.
- **Contextual Exporting**:
  - Full custom date range export.
  - 1-tap export scoped directly to the selected Month.
  - 1-tap export scoped directly to the selected Week.
- **Mobile Native Sharing**: Integrates `expo-sharing` to dispatch the generated PDF directly to WhatsApp, email, or device storage.

### 5.5. Offline Architecture & Local Storage
- **Custom FileSystem Storage Adapter**: Uses `expo-file-system/legacy` JSON file storage, completely bypassing external `AsyncStorage` native module failures in Expo Go.
- **Local Cache Layer**: Automatically caches customer lists, wholesaler lists, item catalogs, and detailed transaction ledgers for zero-latency screen renders.
- **Persistent Offline Queue**: Queues write operations when offline with UUIDs, ID remapping (local temporary IDs to MongoDB ObjectIds), and automated background synchronization.
- **Network Status Banner**: Persistent UI indicator displaying offline/online connection state and pending sync items.

---

## 6. Out of Scope (Deferred Features)
- **Multi-Device Real-Time Syncing (CRDTs / WebSockets)**: The app is designed for single-operator shop management; multi-user concurrent edits on the same shop account are not currently handled with conflict-free replication.
- **Thermal Bluetooth POS Printing**: Printing is currently delivered via PDF and OS share sheets rather than direct ESC/POS Bluetooth hardware protocols.
- **SMS Gateway Integration**: Sending automated transactional SMS is deferred in favor of free, ubiquitous WhatsApp PDF sharing.
- **Barcode & Weight Scale Hardware Integration**: Manual input of quantity/pieces is currently used instead of direct serial hardware connections.
- **Multi-Currency & Tax/GST Handling**: The app strictly operates on single-currency integer/decimal values (PKR/INR) without automated sales tax deductions.

---

## 7. Success Metrics
- **Balance Integrity**: 0% math calculation errors or drift across lifetime balances, opening balances, and weekly totals.
- **Speed to Entry**: Under 10 seconds for a merchant to open the app and log a credit or wholesale delivery.
- **Screen Render Latency**: Under 200ms initial screen render time leveraging local FileSystem cache before network revalidation.
- **Offline Fault Tolerance**: 100% of offline queued transactions successfully synchronized without data loss upon reconnecting.
- **Report Generation Time**: Under 3 seconds to generate and open the native share sheet for a month-long PDF ledger.

---

## 8. Assumptions & Constraints
- **Hosting Environment**: The backend runs on Vercel Serverless Functions (`@vercel/node`), requiring all endpoints to complete within serverless timeout limits (maxDuration configured to 30s) and bundling fonts directly.
- **Database Limits**: Uses MongoDB Atlas shared cluster (M0 Free Tier), necessitating optimized compound indexes on `{ customerId: 1, entryDate: 1 }` and `{ wholesalerId: 1, entryDate: 1 }`.
- **Mobile Target**: Android is the primary production target (distributed as standalone APK via Expo EAS Build with package `com.muhammadharoon.dailytally`), with secondary support for iOS.
- **Operating Currency**: Pakistani Rupee (Rs. / PKR) as the implicit business currency.
