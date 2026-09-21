# Design System — Daily Tally (Karobar Hisab)

## 1. Design Principles

The design of **Daily Tally** is crafted specifically for shopkeepers and small business operators in fast-paced retail and wholesale environments:
- **High Contrast & Immediate Legibility**: Large amounts, bold typography, and clear distinctions between debt and payment ensure readability even in bright outdoor market light or on low-end mobile screens.
- **Generous Touch Targets**: All buttons, cards, and input triggers have minimum touch targets of at least 44×44 points to accommodate busy hands.
- **Semantic Color Psychology**: Colors are never decorative; they always convey financial meaning:
  - **Emerald Green**: Core brand identity, headers, and neutral balances.
  - **Warm Amber**: Credit issued (*Udhaar*), purchases (*Kharedari*), or items leaving the shop.
  - **Rich Forest Green**: Money received (*Wasool Raqam*), payments, and zero debt states.
  - **Deep Red**: Outstanding debt (*Baqi Baqaya*), shortages, warnings, and destructive actions.
- **Tactile Card-Based Hierarchy**: Screens use soft-bordered, elevated white cards set against a warm neutral background (`#F8F7F4`), creating clear visual containers for transactions and summary numbers.

---

## 2. Color Palette

All colors are centrally defined in [`mobile/src/constants/theme.js`](file:///e:/DailyTally/mobile/src/constants/theme.js). No ad-hoc hex values should be used in style sheets.

| Token Name | Hex Code | Purpose & Usage |
|---|---|---|
| `primary` | `#0F6E56` | Top navigation headers, main submit buttons, brand icon badges |
| `primaryLight` | `#E1F5EE` | Selected filter pills, light card tints, primary action badges |
| `accent` | `#BA7517` | "Add Item" button, Udhaar transactions, wholesale purchase highlights |
| `accentLight` | `#FEF3E2` | Amber transaction item card background, Udhaar badge background |
| `success` | `#3B6D11` | "Wasool Raqam" button, payment entry cards, zero-balance indicators |
| `successLight` | `#EAF5DE` | Payment entry card background, settled debt badge background |
| `danger` | `#A32D2D` | Outstanding balance text, negative numbers, shortage amounts, delete buttons |
| `dangerLight` | `#FDE8E8` | Outstanding debt pill background, error banners, delete confirmation modals |
| `error` | `#A32D2D` | Alias for `danger` (used in form validation error text) |
| `background` | `#F8F7F4` | Global application screen background (soft warm gray) |
| `cardBackground`| `#FFFFFF` | Surface color for cards, modals, dropdown lists, bottom sheets |
| `textPrimary` | `#2C2C2A` | Primary typography color (titles, customer names, primary amounts) |
| `textSecondary` | `#5F5E5A` | Subtitles, date stamps, unit rates, secondary metadata labels |
| `border` | `#E5E3DC` | Card borders, table grid lines, input dividers |

---

## 3. Typography

The typography scale is optimized for numerical clarity and quick scanning:

### Predefined Text Styles
```javascript
typography = {
  h1: { fontSize: 24, fontWeight: '600', color: colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '600', color: colors.textPrimary },
  h3: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400', color: colors.textPrimary },
  bodySmall: { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
  amountLarge: { fontSize: 26, fontWeight: 'bold' },
  amountMedium: { fontSize: 18, fontWeight: 'bold' },
}
```

### Font Size & Weight Tokens
| Token | Value | Usage |
|---|---|---|
| `fontSize.xs` | `11` | Date badges, timestamp labels, tiny status tags |
| `fontSize.sm` | `13` | Secondary captions, subtitle metadata, input hint labels |
| `fontSize.md` | `15` | Default body copy, list item labels, form inputs |
| `fontSize.lg` | `18` | Card section titles, medium balance amounts |
| `fontSize.xl` | `22` | Modal headers, prominent section titles |
| `fontSize.xxl` | `26` | Hero balance displays on Customer and Wholesaler detail screens |
| `fontWeight.normal` | `'400'` | Standard body text and notes |
| `fontWeight.medium` | `'500'` | Input labels and table header cells |
| `fontWeight.semibold` | `'600'` | Card titles, button labels, and sub-headers |
| `fontWeight.bold` | `'700'` | Financial amounts and key summary metrics |

---

## 4. Spacing & Layout Rules

### Spacing Scale
- `spacing.xs` = `4px`
- `spacing.sm` = `8px`
- `spacing.md` = `12px`
- `spacing.lg` = `16px` (Default horizontal screen margin)
- `spacing.xl` = `20px`
- `spacing.xxl` = `24px`

### Card Style Tokens (`cardStyles`)
All primary content surfaces inherit from `cardStyles`:
- **Border Radius**: `16px` (gentle, modern rounded corners).
- **Padding**: `14px`.
- **Border Width**: `1px` (`borderColor: colors.border`).
- **Shadow**: Light natural elevation (`shadowColor: '#000'`, `shadowOffset: { width: 0, height: 2 }`, `shadowOpacity: 0.05`, `shadowRadius: 6`, `elevation: 2`).

---

## 5. UI Component Library

The application features 13 dedicated, reusable components located in `mobile/src/components/`:

### 1. `Card.js`
- **Description**: The fundamental surface container providing consistent background (`#FFFFFF`), 16px rounded corners, border, and subtle elevation shadow.
- **When to Use**: Every modular piece of content (customer item, month summary, form section, hero block) must be wrapped in `Card`.

### 2. `PrimaryButton.js`
- **Description**: High-visibility touchable button supporting custom titles, loading states (`ActivityIndicator`), disabled states, and color variants (`primary`, `accent`, `success`, `danger`, `outline`).
- **When to Use**: Main screen actions (e.g., Save Customer, Add Udhaar, Login, Send Report).

### 3. `EmptyState.js`
- **Description**: Displays an emoji illustration, a clear heading, an explanatory description, and an optional action button when a list contains no items.
- **When to Use**: Customer list with 0 results, empty transaction weeks, empty search queries, or empty item catalogs.

### 4. `LoadingSpinner.js`
- **Description**: A centered, themed `ActivityIndicator` with an optional status label.
- **When to Use**: Full-screen or section-level asynchronous fetch states.

### 5. `UpdatingIndicator.js`
- **Description**: A compact, non-intrusive floating badge indicating that background network revalidation or cache syncing is active.
- **When to Use**: Displays subtly at the top of detail screens while fresh data is being fetched over a slow connection.

### 6. `NetworkStatusBanner.js`
- **Description**: A top banner that slides into view when internet connection is lost (`"Offline Mode"`), showing the number of pending queued actions awaiting sync.
- **When to Use**: Rendered globally inside `App.js` directly beneath the navigation status bar.

### 7. `ProfileDropdownMenu.js`
- **Description**: Header right navigation component rendering a compact profile modal with options to view profile, manage items, or log out.
- **When to Use**: Attached to navigation headers (`HomeScreen`, `DashboardScreen`).

### 8. `EntryTypeFilter.js`
- **Description**: A horizontal pill filter bar allowing users to filter entries by type: `All`, `Udhaar (Items)`, and `Wasool (Payments)`.
- **When to Use**: Customer and Wholesaler detail screens to quickly isolate specific transaction streams.

### 9. `EyeIcon.js`
- **Description**: SVG vector toggle for revealing/obscuring passwords in text inputs.
- **When to Use**: Login and Signup password fields.

### 10. `ItemDropdown.js`
- **Description**: Searchable bottom sheet / modal dropdown allowing the shopkeeper to select an item from the customer Item Master, auto-populating default unit rates.
- **When to Use**: `AddItemEntryScreen` when creating customer credit entries.

### 11. `WholesalerItemDropdown.js`
- **Description**: Searchable item picker tailored for wholesale purchase items with default procurement rates.
- **When to Use**: `AddPurchaseEntryScreen` for main purchases, extra items, and shortage items.

### 12. `SendReportModal.js`
- **Description**: Comprehensive modal dialog allowing selection of date ranges ("Is Hafte Ka", "Is Mahine Ka", or "Custom Range"), downloading PDF reports, and triggering native OS sharing.
- **When to Use**: Customer detail, month detail, and week detail screens.

### 13. `WholesalerSendReportModal.js`
- **Description**: Wholesaler-specific report modal with purchase, payment, extra/shortage, and advance balance breakdowns.
- **When to Use**: Wholesaler detail, month detail, and week detail screens.

---

## 6. Iconography

Daily Tally uses standardized native UTF-8 emojis rather than heavy vector icon fonts to ensure instant rendering with zero bundle overhead:
- 👥 `Customer / Gahak`
- 🚛 `Wholesaler / Saudagar`
- 🛒 `Item Catalog / Sale Items`
- 💰 `Wasool Raqam / Cash Payments`
- 📦 `Kharedari / Purchase Delivery`
- ➕ `Add New Entry / Add Extra Items`
- ➖ `Shortage / Kam Aaya Items`
- 📋 `Monthly & Weekly Hisab Cards`
- 📊 `Report Bhejein / PDF Export`
- 🔒 `Security / Mehfooz Khata`
- ⚙️ `Settings & Item Management`

---

## 7. Accessibility & Responsiveness

- **Safe Area Inset Handling**: All screens use `useSafeAreaInsets()` from `react-native-safe-area-context` to dynamically add bottom padding:
  ```javascript
  paddingBottom: Math.max(insets.bottom, 16) + spacing.md
  ```
  This guarantees that action buttons and footers are never obscured by Android 3-button navigation bars or iOS home indicator bars.
- **Flexible Keyboard Avoiding**: Form screens use `KeyboardAvoidingView` or `ScrollView` with `keyboardShouldPersistTaps="handled"` so inputs remain accessible when the virtual keyboard is open.
- **Orientation Lock**: Fixed to `portrait` in `app.json` to prevent layout breaks during rapid one-handed shop usage.

---

## 8. Customer Portal Design Variant (Non-Technical Audience)

The **Customer Self-Service Portal** (`mobile/src/screens/customerPortal/`) implements a distinct design variant specifically crafted for non-technical retail customers, including those with limited literacy or low app proficiency:

### Key Design Pillars
1. **Paper Receipt / Passbook Aesthetic**:
   - Instead of looking like a dense banking or accounting app, the UI feels like receiving a friendly paper receipt or physical passbook (*Khatavahi*).
   - Generous 20px card border radii, clean dividing lines, soft shadows, and prominent transaction icons (`📦` for Udhaar items taken, `💵` for Wasool cash paid).
2. **Arm's-Length Dominant Typography**:
   - **Hero Balance**: Displayed at **42px bold**, unmissable and readable from arm's length.
   - Distinct conversational status pill directly beneath the hero number (e.g. `⚠️ Yeh raqam aap ne dukaan par ada karni hai` in red, or `✅ Shukriya! Aapka koi baqaya nahi hai` in green).
   - Supporting totals are explicitly labeled with natural questions: `"Kitna Samaan Liya"` and `"Kitne Paise Diye"`.
3. **Conversational, Warm Roman Urdu**:
   - Technical terms like *"Financial Overview"*, *"Entries"*, *"Debit/Credit"*, or *"Record"* are replaced with friendly phrases: *"Aapka Kul Baqi Baqaya"*, *"Aapke Lena Dena Ki Tafseel"*, and *"Bahar Niklein 🚪"*.
4. **De-Cluttered Information Architecture**:
   - **Removed Filter Chips**: Customers do not need `Sab / Udhaar / Wasool` toggle chips; all entries are visible in straightforward chronological order.
   - **Removed Exact Timestamps**: Seconds and minutes are omitted from customer rows to prevent visual noise (only friendly dates like *"4 September 2026"* are shown).
5. **Month & Week Structure (Restored with Paper-Receipt Styling)**:
   - Customers navigate hierarchically from `CustomerPortalHomeScreen` (Month Cards list) into `CustomerPortalMonthDetailScreen` (weekly cards & day-wise transactions), and into `CustomerPortalWeekDetailScreen` (week transactions).
   - All screens adhere strictly to the friendly, non-technical paper-receipt aesthetic with large text, prominent icons, color-coded amounts, and no filter chips.
6. **Thursday-to-Wednesday Week Grouping**:
   - All haftawar (weekly) breakdowns follow the business's Thursday-to-Wednesday week alignment (`mobile/src/utils/weekBoundaries.js`).
7. **Large, High-Affordance Action Buttons**:
   - Large full-width buttons with both icons and explicit labels (e.g., `📄 Apna Hisab PDF Mein Download Karein`), eliminating ambiguous small icon-only buttons.

