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

### 🤖 Android (APK)
To build a fresh installer for your Android phone, run:
```powershell
# Navigate to mobile directory
cd mobile_app

# Build the Debug APK
flutter build apk --debug
```
The file will be located at: `mobile_app/build/app/outputs/flutter-apk/app-debug.apk`

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

## ✨ Premium Features

- **Personalized User Profiles:** Dedicated page to customize your public name and professional bio.
- **Permanent Avatar Hosting:** Integrated Cloudinary storage ensures your profile picture survives every update.
- **Smart Schema Sync:** Intelligent backend initialization that auto-detects and fixes database mismatches.
- **Global Persistence:** Powered by Aiven PostgreSQL—your tasks are safe anywhere in the world.
- **Real-Time Analytics:** Interactive charts showing your weekly growth and completion trends.
- **Premium Glassmorphism:** State-of-the-art UI with frosted-glass effects and interactive lighting.
- **Toast Notifications:** Smooth confirmation popups for every major action.
- **Automated Deployment:** Integrated `render.yaml` blueprint for one-click infra setup.
