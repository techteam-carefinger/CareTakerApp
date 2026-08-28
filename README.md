# CareFinger Taker

React Native app for CareFinger caretakers. It pairs with `CareFIngerUserApp`:

- **User app** books a caretaker (`api/patient`)
- **Taker app** goes online, accepts nearby requests, verifies the patient PIN, and completes the service (`api/taker`)

## Stack

Same as the user app: React Native 0.85.2, Firebase Phone Auth, React Navigation, Google Maps, Poppins.

Android application id: `com.caretakerapp` (already present in the shared Firebase `google-services.json`).

## Run

```sh
cd CareFingerTakerApp
yarn install
yarn start
yarn android
```

## Flow

1. Phone OTP login
2. Caretaker profile setup (name + vehicle)
3. Home map with Go Online / Go Offline
4. Incoming request → Accept
5. Navigate to pickup → enter 4-digit PIN → start timer → complete
6. Earnings and job history
