# Productivity Dashboard 🚀

A full-stack, Full-Cloud premium To-Do application with real-time analytics and a professional dashboard layout.

## 🌐 Live Deployment

- **Dashboard:** [https://todo-frontend-98on.onrender.com/](https://todo-frontend-98on.onrender.com/)
- **API Documentation:** [https://todo-backend-1lun.onrender.com/docs](https://todo-backend-1lun.onrender.com/docs)

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

### 🔐 Google Sign-In & OAuth Setup
To ensure Google Sign-In works perfectly across all environments without relying on the Firebase SDK, the project uses direct Google Cloud OAuth. In your Google Cloud Console (**APIs & Services > Credentials**), you must maintain these 4 Client IDs:

1. **Web Client 1**: This ID is hardcoded in the Flutter source code (`serverClientId`). It tells Google *where* the request originated.
2. **Android Client (Debug)**: Contains your local `debug.keystore` SHA-1. Allows login during standard `flutter run`.
3. **Android Client (Release)**: Contains your `release-key.jks` SHA-1. Allows login when testing native release builds (`flutter run --release`).
4. **Android Client (Play Store)**: Contains the App Signing SHA-1 provided by the **Google Play Console**. Allows users who downloaded the app from the store to log in.

> [!NOTE]
> The Flutter app only stores the **Web Client ID**. Google automatically handles the Android Client validation behind the scenes by comparing the app's physical signature against the list of Android Client SHA-1s in your Cloud account!

## ✨ Premium Features

- **Personalized User Profiles:** Dedicated page to customize your public name and professional bio.
- **Permanent Avatar Hosting:** Integrated Cloudinary storage ensures your profile picture survives every update.
- **Smart Schema Sync:** Intelligent backend initialization that auto-detects and fixes database mismatches.
- **Global Persistence:** Powered by Aiven PostgreSQL—your tasks are safe anywhere in the world.
- **Real-Time Analytics:** Interactive charts showing your weekly growth and completion trends.
- **Premium Glassmorphism:** State-of-the-art UI with frosted-glass effects and interactive lighting.
- **Toast Notifications:** Smooth confirmation popups for every major action.
- **Automated Deployment:** Integrated `render.yaml` blueprint for one-click infra setup.
