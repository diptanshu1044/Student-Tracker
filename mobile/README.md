# StudentOS Mobile (Expo)

## Start with Expo Go (physical device)

1. Install dependencies:

```bash
npm install
```

2. Start Metro:

```bash
npx expo start
```

3. Open Expo Go on your phone and scan the QR code.

If your phone cannot connect on local network, use tunnel mode:

```bash
npx expo start --tunnel
```

## Important: `npm run android` vs Expo Go

- `npm run android` runs `expo start --android`, which requires Android SDK and `adb` on your machine.
- Expo Go on a real device does not require Android SDK.
- If you only want Expo Go, use `npm start` or `npx expo start`.

## Backend URL in Expo Go

- The app will use `EXPO_PUBLIC_API_BASE_URL` if provided.
- If not provided, it auto-detects your dev machine host from Expo and falls back to `http://<your-machine-ip>:8080/api/v1` during development.
- Final fallback is `http://localhost:8080/api/v1`.

To force a custom backend URL:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:8080/api/v1 npx expo start
```

## If you also want Android emulator/device via adb

Install Android Studio + SDK + platform-tools, then set environment variables in your shell profile:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

Then restart terminal and run:

```bash
npm run android
```
