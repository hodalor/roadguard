# RoadGuard Ghana

RoadGuard Ghana is a multi-application starter workspace for a vehicle assistance platform focused on emergency alerts, roadside service discovery, hazard reporting, and offline emergency information.

## Workspace

- `mobile`: Flutter-ready mobile application scaffold for motorists
- `admin`: React admin dashboard built without Vite
- `server`: Node.js, Express, and MongoDB starter backend

## Core Product Scope

- One-tap SOS emergency alerting with GPS support
- Nearby service provider discovery for mechanics and towing
- Road hazard reporting and moderation workflows
- Offline emergency guidance and first-aid content
- Admin monitoring and analytics dashboard

## Getting Started

### 1. Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### 2. Admin Dashboard

```bash
cd admin
npm install
npm start
```

### 3. Mobile App

The environment used for this scaffold does not have the Flutter CLI installed, so the `mobile` folder is created as a Flutter-ready starter manually.

After installing Flutter locally, run:

```bash
cd mobile
flutter pub get
flutter run
```

If you want the full native Flutter project files regenerated, you can also run:

```bash
flutter create .
```

## Suggested APIs

- `POST /api/sos`
- `GET /api/providers`
- `POST /api/hazards`
- `GET /api/content`
- `GET /api/health`

## Firebase Setup

### Mobile

- Copy `mobile/.env.example` to `mobile/.env`
- Add your Firebase project values to `mobile/.env`
- Add your native Firebase files after generating platform folders:
  - `android/app/google-services.json`
  - `ios/Runner/GoogleService-Info.plist`
- Install Flutter dependencies and run the app:

```bash
cd mobile
flutter pub get
flutter run
```

### Server

- Copy `server/.env.example` to `server/.env`
- Configure Firebase Admin in one of two ways:
  - Set `FIREBASE_SERVICE_ACCOUNT_PATH` to your downloaded service account JSON file
  - Or set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`

### Firebase Endpoints

- `GET /api/auth/verify` with `Authorization: Bearer <firebase-id-token>`
- `POST /api/notifications/register-token`
- `POST /api/notifications/send`
