# AI-Smart Todo 🚀

A full-stack, Full-Cloud premium To-Do application with real-time analytics and a professional dashboard layout.

---

### 📱 App Store Listing Details

_(Use these exact descriptions when publishing to Google Play or the Apple App Store)_

**Short Description (Max 80 chars):**
Organize tasks, track real-time analytics, and boost your daily productivity!

**Full Description:**
AI-Smart ToDo is your ultimate productivity companion, designed to seamlessly synchronize your tasks, goals, and daily roadmaps across all your devices.

Whether you're a professional managing complex projects or a student tracking daily assignments, AI-Smart ToDo provides a beautiful, clutter-free dashboard to keep you focused on what matters most. With lightning-fast real-time synchronization powered by Google Cloud, your data is always safe, secure, and instantly available wherever you go.

**Key Features:**
✓ **Secure One-Tap Login:** Instantly access your tasks using your existing Google account. No new passwords to remember!
✓ **Real-Time Analytics:** Visualize your daily, weekly, and monthly progress with gorgeous charts that track your completion rates.
✓ **Smart Task Delegation:** Easily assign responsibilities to yourself or delegate them to team members.
✓ **Personalized User Profiles:** Customize your bio and upload permanent avatars to make your workspace your own.
✓ **Intelligent Roadmaps:** Break down massive goals into manageable daily steps.
✓ **Dynamic Dark Mode:** Work comfortably day or night with adaptive, premium color schemes.

Built with industry-leading privacy standards, we ensure your personal data remains strictly confidential. Download AI-Smart ToDo today and experience the future of digital organization!

---

## 🌐 Live Deployment

- **Dashboard:** [https://todo-frontend-98on.onrender.com/](https://todo-frontend-98on.onrender.com/)
- **API Documentation:** [https://todo-backend-1lun.onrender.com/docs](https://todo-backend-1lun.onrender.com/docs)

## 📡 Service Resilience & High Availability

To ensure the application remains responsive and avoids "cold starts" on Render's free tier, we use an external pinger (e.g., [Cron-job.org](https://cron-job.org)) to keep the services awake.

### Pinger Endpoints:
1.  **Backend (Critical):** `https://todo-backend-1lun.onrender.com/health`
    *   *Interval: Every 5 minutes*
    *   *Purpose: Keeps the API and Database connection warm.*
2.  **Frontend:** `https://todo-frontend-98on.onrender.com`
    *   *Interval: Every 10-15 minutes*
    *   *Purpose: Keeps the web UI instantly accessible.*

> [!NOTE]
> We moved from GitHub Actions `schedule` to **Cron-job.org** because GitHub's free-tier scheduler can be delayed by over an hour, which is too slow to prevent Render's 15-minute spin-down.

## 🛠 Tech Stack

- **Backend:** FastAPI, SQLModel, Uvicorn
- **Database:** **Aiven PostgreSQL** (Global Persistence)
- **Image Storage:** **Cloudinary** (Permanent Profile Avatars)
- **Frontend:** React, Tailwind CSS v4, Framer Motion, Recharts
- **Hosting:** Render.com

## 🚀 Getting Started (Local)

### 1️⃣ Start the Core (Backend & Web)

This command launches both the FastAPI server and the React dashboard simultaneously using the cloud database.

```powershell
# From the root directory
.\run.ps1
```

### 2️⃣ Start the Mobile Experience (Flutter)

Ensure the Backend is running first, then launch the native app in your emulator.

```powershell
# 1. Open a new terminal and navigate to mobile
cd mobile_app

# 2. Launch your Android Emulator
flutter emulators --launch Medium_Phone_API_36.1

# 3. Launch the App
flutter run
```

## 📲 Mobile Packaging

### 🤖 Android (Packaging & Icon Refresh)

To refresh icons and build a clean release version for your phone:

```powershell
# Navigate to mobile directory
cd mobile_app

# 1. Clean and refresh dependencies
flutter clean
flutter pub get

# 2. Update Launcher Icons (Android & iOS)
dart run flutter_launcher_icons
```

#### 📦 APK — Install directly on a device/emulator

```powershell
# RELEASE APK: Optimized, no "Debug" banner. Use for sharing/side-loading.
flutter build apk --release

# DEBUG APK: Slower, includes debug tools. Use for development only.
flutter build apk --debug
```

- **Release APK**: `mobile_app/build/app/outputs/flutter-apk/app-release.apk`
- **Debug APK**: `mobile_app/build/app/outputs/flutter-apk/app-debug.apk`

#### 🏪 AAB — Upload to Google Play Store

```powershell
# RELEASE AAB: Required format for Google Play Store submission.
flutter build appbundle --release

# DEBUG AAB: For testing purposes only (NOT accepted by Play Store).
flutter build appbundle --debug
```

- **Release AAB**: `mobile_app/build/app/outputs/bundle/release/app-release.aab`
- **Debug AAB**: `mobile_app/build/app/outputs/bundle/debug/app-debug.aab`

> [!TIP]
> **APK vs AAB?**
>
> - Use **APK** to install directly on a phone or emulator (side-loading).
> - Use **AAB** (Android App Bundle) to publish on the **Google Play Store** — it's smaller and optimized per device. Play Store does NOT accept APK files anymore.

> [!IMPORTANT]
> **Release signing is required for Play Store.** The release keystore (`release-key.jks`) and `key.properties` must exist in `android/app/` and `android/` respectively. Never commit these files to Git.

### 🍏 iOS (Cloud Build)

We have enabled **GitHub Actions** to build the iOS version for you in the cloud (no Mac required!).

1. Go to your GitHub repository.
2. Click on the **"Actions"** tab.
3. Select the **"Build iOS App"** workflow.
4. Download the latest **"ios-simulator-build"** artifact from the bottom of the successful run page.
5. Upload this zip to **[Appetize.io](https://appetize.io)** to test it in your browser!

### 🧪 Local Testing (Developer Access)

To test instantly without Google login:

- On Web/Mobile Login, enter any username (e.g. `agent_alpha`) in the **Dev Auth** field.
- This creates a unique persistent profile for that name immediately.

### 🤖 Testing the AI API Endpoints (Gemini 2.5 Flash)

The backend features `gemini-2.5-flash-lite` integration. To test it manually from the browser:

1. Log in to the web application normally.
2. Open your browser's Developer Console (`F12` → **Console** tab).
3. If you see a warning, type `allow pasting` and press Enter.
4. Paste the following snippet to test the natural language task parser:
   ```javascript
   const token = localStorage.getItem('token');
   fetch('http://localhost:8000/ai/parse-task', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
     body: JSON.stringify({ message: "wash clothes tomorrow" })
   }).then(r => r.json()).then(console.log);
   ```

### 🧹 Troubleshooting: Duplicate Apps on Emulator

If you see two app icons on your emulator after a package name change, uninstall the old one:

```powershell
# Windows (if adb is not in PATH)
& "$env:LOCALAPPDATA\Android\sdk\platform-tools\adb.exe" uninstall com.example.mobile_app

# Or if adb is in PATH
adb uninstall com.example.mobile_app
```

Alternatively, long-press the duplicate icon on the emulator and drag it to **Uninstall**.

### 🔐 Google Sign-In & OAuth Setup

To ensure Google Sign-In works perfectly across all environments without relying on the Firebase SDK, the project uses direct Google Cloud OAuth. In your Google Cloud Console (**APIs & Services > Credentials**), you must maintain these 4 Client IDs:

1. **Web Client 1**: This ID is hardcoded in the Flutter source code (`serverClientId`). It tells Google _where_ the request originated.
2. **Android Client (Debug)**: Contains your local `debug.keystore` SHA-1. Allows login during standard `flutter run`.
3. **Android Client (Release)**: Contains your `release-key.jks` SHA-1. Allows login when testing native release builds (`flutter run --release`).
4. **Android Client (Play Store)**: Contains the App Signing SHA-1 provided by the **Google Play Console**. Allows users who downloaded the app from the store to log in.
5. **iOS Client**: Contains your iOS App Bundle ID. The generated Client ID is stored alongside a Custom URL Scheme in `Info.plist` to allow simulator and native device login.

> [!NOTE]
> For Android, the Flutter app only stores the **Web Client ID**. Google automatically handles Android Client validation behind the scenes by comparing the app's physical signature! The iOS app explicitly stores its dedicated Client ID to trigger the Safari OAuth popup.

### 📜 Legal & Compliance Links

The application hosts its mandatory legal documentation publicly to comply with Google Play Store guidelines:

- **Privacy Policy:** [https://todo-frontend-98on.onrender.com/privacy-policy.html](https://todo-frontend-98on.onrender.com/privacy-policy.html)
- **Terms & Conditions:** [https://todo-frontend-98on.onrender.com/terms-and-conditions.html](https://todo-frontend-98on.onrender.com/terms-and-conditions.html)

## ✨ Premium Features

- **Personalized User Profiles:** Dedicated page to customize your public name and professional bio.
- **Permanent Avatar Hosting:** Integrated Cloudinary storage ensures your profile picture survives every update.
- **Smart Schema Sync:** Intelligent backend initialization that auto-detects and fixes database mismatches.
- **Global Persistence:** Powered by Aiven PostgreSQL—your tasks are safe anywhere in the world.
- **Real-Time Analytics:** Interactive charts showing your weekly growth and completion trends.

## 🛣️ Upcoming Features

- **AI-Assisted Task Completion Guide:** Context-aware artificial intelligence to help break down complex tasks and guide you step-by-step toward completion!
- **Premium Glassmorphism:** State-of-the-art UI with frosted-glass effects and interactive lighting.
- **Toast Notifications:** Smooth confirmation popups for every major action.
- **Automated Deployment:** Integrated `render.yaml` blueprint for one-click infra setup.
