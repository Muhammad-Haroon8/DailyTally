# Karobar Hisab - Mobile App

React Native mobile application for **Karobar Hisab** built using **Expo** (managed workflow). Designed to track customer credit (udhaar) and payments (wasool) for meat and grocery shops.

---

## Folder Structure

```
mobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js       # Placeholder Login screen with navigation
│   │   ├── SignupScreen.js      # Placeholder Signup screen with navigation
│   │   └── DashboardScreen.js   # Placeholder Dashboard screen with navigation
│   ├── navigation/
│   │   └── AppNavigator.js      # React Navigation Native Stack Navigator
│   ├── constants/
│   │   └── theme.js             # Shared color palette and theme constants
│   ├── context/                 # Context API providers (placeholder for Phase 1 Auth)
│   └── api/
│       └── client.js            # Axios client instance with dynamic baseURL
├── App.js                       # Root component with NavigationContainer
├── .env.example                 # Example environment variables template
├── app.json                     # Expo configuration
├── package.json                 # Project dependencies and scripts
└── README.md                    # Documentation and setup instructions
```

---

## Getting Started

### 1. Install Dependencies

Open your terminal, navigate into the `mobile` directory, and run:

```bash
cd mobile
npm install
```

### 2. Configure Environment Variables (API Base URL)

Copy the provided `.env.example` file to create `.env`:

```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Configure your API endpoint in `.env`:

- **Expo Go on a Physical Phone**: Set to your computer's local Wi-Fi IP address (e.g., `http://192.168.1.100:5000/api`).
- **Android Emulator**: Set to `http://10.0.2.2:5000/api`.
- **iOS Simulator / Web**: Set to `http://localhost:5000/api`.

```env
API_BASE_URL=http://localhost:5000/api
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

### 3. Run the App with Expo

Start the Expo development server:

```bash
npx expo start
```

### 4. Open in Expo Go

1. Download and install **Expo Go** from the App Store (iOS) or Google Play Store (Android).
2. Scan the QR code displayed in your terminal using:
   - Camera app on iOS
   - Expo Go app on Android
3. The app will launch into the **Login** screen. Use the navigation buttons to test switching between **Login**, **Signup**, and **Dashboard**.
