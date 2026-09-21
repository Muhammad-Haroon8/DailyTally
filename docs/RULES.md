# Development Rules & Standards — Daily Tally (Karobar Hisab)

## 1. General Principles

### 1.1. Server-Side Financial Authority
- **The Client Never Dictates Totals**: The frontend mobile app must **never** calculate the final monetary amounts saved to the database. The client may display preview calculations for UX, but the backend server must always independently compute:
  - Udhaar entries: `Math.round(quantity * rate * 100) / 100`
  - Wholesale purchases: `Math.round((baseAmount + extraAmount - shortageAmount) * 100) / 100`
  - Advance balance and deductions: Server-side validation against current pool totals.
- **Floating-Point Precision**: Financial numbers must always be rounded to two decimal places (`Math.round(val * 100) / 100`) to prevent JavaScript floating-point drift.

### 1.2. Strict Tenant Isolation
- Every database query and mutation must be scoped to `req.userId`.
- Even when fetching child documents (e.g., an Entry belonging to a Customer), the backend must verify that the parent Customer belongs to `req.userId` before reading or mutating the entry.
- Direct object ID lookups without tenant scoping (e.g., `findById(id)`) are strictly forbidden on tenant-owned entities.

### 1.3. Domain-First Terminology
- Use Roman Urdu business terms consistently in user-facing copy and code variables where appropriate:
  - Customers / Gahak (`customer`, `gahak`)
  - Customer Credit / Udhaar (`udhaar`, `item`)
  - Customer Payment / Collection (`wasool`, `payment`)
  - Wholesalers / Suppliers / Saudagar (`wholesaler`, `saudagar`)
  - Purchases (`kharedari`, `purchase`)
  - Wholesaler Payments / Adaigi (`adaigi`, `payment`)
  - Advance Disbursed (`advance`)
  - Advance Deduction / Settlement (`advanceSettlement`, `advance se katein`)
  - Net Balance / Remaining Dues (`baqi baqaya`)

### 1.4. Offline-First User Experience
- Screens must never block or render blank white screens while waiting for network requests.
- Always load from local cache (`storageAdapter.js` / `localCache.js`) first, then revalidate in the background.
- Keep the custom Expo FileSystem storage adapter intact; never introduce unbundled native packages that could crash Expo Go.

### 1.5. Business Week Convention (Starts on Thursday)
- **Thursday-to-Wednesday Trading Week**: In accordance with the business's real trading cycles, a "week" runs from **Thursday through Wednesday** (7 days, Thursday=Day 1 through Wednesday=Day 7).
- **Week Boundaries Algorithm**:
  - The first week of a month is partial if the 1st of the month is not a Thursday (runs from the 1st through the day before the first Thursday).
  - Subsequent weeks are full Thursday-to-Wednesday 7-day blocks.
  - The last week of a month is partial if the month ends before Wednesday.
- **Single Source of Truth**: All week calculations, summary groupings, and fallback parameters must strictly use the shared utilities:
  - Frontend: `mobile/src/utils/weekBoundaries.js` (`getWeeksInMonth`, `findWeekForDay`, `getWeekFallback`).
  - Backend: `backend/utils/weekBoundaries.js`.
- Never use Monday-start weeks or generic day-of-month (1-7, 8-14) chunking in any screen.

---

## 2. Technology & Coding Standards

### 2.1. File & Directory Naming Conventions
- **React Components & Screens**: Use `PascalCase` with descriptive suffixes:
  - Screens: `[Name]Screen.js` (e.g., `CustomerDetailScreen.js`, `AddPurchaseEntryScreen.js`)
  - Components: `[Name].js` (e.g., `Card.js`, `NetworkStatusBanner.js`, `PrimaryButton.js`)
- **Backend Files & Utility Modules**: Use `camelCase` with descriptive suffixes:
  - Controllers: `[entity]Controller.js` (e.g., `customerController.js`, `wholesalerEntryController.js`)
  - Routes: `[entity]Routes.js` (e.g., `customerRoutes.js`, `entryRoutes.js`)
  - Models: `PascalCase.js` matching Mongoose model names (e.g., `Customer.js`, `WholesalerEntry.js`)
  - Middleware: `[name]Middleware.js` (e.g., `authMiddleware.js`)
  - Services: `[name]Service.js` (e.g., `pdfReportService.js`)
  - Storage & API: `camelCase.js` (e.g., `localCache.js`, `storageAdapter.js`, `client.js`)

### 2.2. Frontend Coding Conventions (React Native)
- **Functional Components**: All components must be functional components utilizing React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`).
- **Safe Area Insets**: Always wrap root screens with `useSafeAreaInsets()` or `SafeAreaProvider` to avoid hardware notches and soft Android navigation bars:
  ```javascript
  const insets = useSafeAreaInsets();
  // Apply paddingBottom: Math.max(insets.bottom, 16) + spacing.md
  ```
- **Consistent Design Tokens**: Never hardcode hex color values or random font sizes directly in `StyleSheet.create`. Always import from `../constants/theme`:
  ```javascript
  import { colors, typography, spacing, cardStyles } from '../constants/theme';
  ```
- **DateTimePicker Best Practice**: In `@react-native-community/datetimepicker`, handle the `dismissed` event gracefully and avoid the deprecated `onChange` syntax to prevent Android LogBox warnings.

### 2.3. Backend Coding Conventions (Express & Mongoose)
- **Controller Pattern**: Controllers must be asynchronous functions wrapped in `try / catch` blocks returning standard JSON responses.
- **Aggregation Pipelines for Financial Balances**: Never fetch thousands of raw entries into Node.js memory to sum balances. Always use MongoDB `$group` and `$lookup` aggregations to perform sums on the database server.
- **Indexed Lookups**: Every query filtering by `customerId` or `wholesalerId` with a date filter must utilize the compound indexes (`{ customerId: 1, entryDate: 1 }`).

---

## 3. Project Structure Conventions

Where should new code go?
1. **New Screen**: Add to `mobile/src/screens/[Name]Screen.js`, export default function, and register it inside `mobile/src/navigation/AppNavigator.js`.
2. **New Reusable UI Element**: Add to `mobile/src/components/[Name].js`.
3. **New Client API Endpoint**: Add the Axios call function into the corresponding file in `mobile/src/api/[entity]Api.js` (never call `axios.post` directly from inside screens).
4. **New Database Collection**:
   - Create schema in `backend/models/[Model].js`.
   - Create controller functions in `backend/controllers/[entity]Controller.js`.
   - Define REST endpoints in `backend/routes/[entity]Routes.js`.
   - Register route handler in `backend/server.js` with `app.use('/api/...', route)`.
5. **New Offline Entity**: Add cache keys and getter/setter functions in `mobile/src/storage/localCache.js`.

---

## 4. Security Rules

1. **Authentication Token Storage**:
   - The JWT token must be stored exclusively in `expo-secure-store`.
   - Never write auth tokens to unencrypted `storageAdapter` JSON files or console logs.
2. **Password Security**:
   - Passwords must be hashed using `bcryptjs` with at least 10 salt rounds before saving.
   - User queries must never return `passwordHash` in API responses (`.select('-passwordHash')`).
3. **Email Immutability**:
   - In `ProfileScreen.js` and `authController.js`, user email is strictly read-only after signup to preserve account identity.
4. **Advance Pool Exhaustion Check**:
   - Advance settlements (`advanceSettlement`) must be validated server-side. The backend must reject any settlement where `settlementAmount > availableAdvancePool` with HTTP 400.
5. **Environment Variable Hygiene**:
   - Never commit `.env` files containing live secrets.
   - All serverless deployments on Vercel must configure `MONGODB_URI` and `JWT_SECRET` via Vercel Project Settings.

---

## 5. Error Handling Standards

### 5.1. Backend Response Shape
- **Success Responses**: Return plain objects or arrays with appropriate HTTP status (200 OK, 201 Created).
- **Error Responses**: Return a standard JSON payload with an `error` key containing a human-readable message:
  ```json
  {
    "error": "Customer name is required"
  }
  ```
- **Standard HTTP Status Codes**:
  - `200 OK`: Successful read or update.
  - `201 Created`: Successful creation.
  - `400 Bad Request`: Validation failure, missing required fields, or financial rule violation (e.g., negative rate, insufficient advance pool).
  - `401 Unauthorized`: Missing, invalid, or expired JWT token.
  - `404 Not Found`: Entity does not exist or does not belong to `req.userId`.
  - `500 Internal Server Error`: Unhandled database or server exception.

### 5.2. Frontend Error Interception
- The Axios response interceptor in `mobile/src/api/client.js` extracts `error.response?.data?.error` and rejects with `new Error(backendMsg)`.
- Network outages are intercepted and translated into user-friendly Roman Urdu text:
  > *"Internet connection ya server se rabta nahi ho saka. Barah-e-karam apna connection check karein."*
- 401 Unauthorized responses trigger an alert and reset user authentication context automatically.

---

## 6. Git & Commit Conventions

The repository follows the **Conventional Commits** specification:
- `feat:` for new user-facing functionality (e.g., `feat: implement Phase 9 PDF report statement generation`).
- `fix:` for bug fixes (e.g., `fix: embed Unicode Arial font in PDF generator`).
- `chore:` for dependency updates, version bumps, or config adjustments (e.g., `chore: bump version to 1.1.0 (versionCode 3)`).
- `fix(scope):` for scoped fixes (e.g., `fix(backend): resolve Vercel serverless PDF generation`).

### Branching & Deployment Strategy
- Primary development occurs on branch `main`.
- Merges to `main` automatically trigger Vercel preview/production deployments for the backend.
- Standalone mobile builds are triggered on-demand via Expo Application Services CLI (`eas build -p android`).

---

## 7. Testing & Verification Checklist

Before deploying any feature or modification to production, the following verification checklist must be executed:

- [ ] **Auth Navigation Check**: Verify that when logged out, `AppNavigator` opens `LoginScreen` without crashing on `initialRouteName`.
- [ ] **Financial Balance Aggregation**: Verify that `balance = totalUdhaar - totalWasool` across Customer screen, Month screen, and Week screen.
- [ ] **Wholesaler Net Math**: Verify that `amount = baseAmount + extraAmount - shortageAmount` on new purchase entries.
- [ ] **Advance Pool Barrier**: Attempt an advance settlement greater than `advanceBaqi`; verify that the backend rejects it with HTTP 400.
- [ ] **PDF Font Verification**: Generate a customer and wholesaler PDF report and verify that text renders cleanly without character truncation or font errors in Vercel serverless runtime.
- [ ] **Offline Cache Resilience**: Put the device in Airplane Mode, open the app, verify that existing customer and wholesaler cards render from `localCache.js`, and verify that `NetworkStatusBanner` appears.
