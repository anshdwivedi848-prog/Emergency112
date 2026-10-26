# Emergency112 Android demonstration app

The Expo/React Native app is a citizen client for the existing Emergency112 ASP.NET Core API. It supports citizen sign-in, profile updates, trusted-contact storage, incident submission, incident history and detail timelines, status refresh, assistance information, an About section, and an optional SOS Call to the configured demo contact. It uses the same SQLite-backed accounts and incident records as the website and admin dashboard.

> **DEMO ONLY — NOT CONNECTED TO REAL EMERGENCY SERVICES.** SOS Call can place a real phone call to the configured contact after a five-second countdown. It does not call emergency services, send SMS, or dispatch responders.

## Prerequisites

- Node.js 22 or later and pnpm.
- An Expo account for a cloud build. EAS Build uploads the `mobile/` project source to Expo's build service. The `.easignore` file excludes local environment files, databases, credentials, signing keys, generated folders, and dependencies. Review it before uploading any source.
- The laptop and Android phone connected to the same private Wi-Fi network for API testing.

The `preview` EAS profile creates an internally distributable **APK**, rather than an AAB. Expo's current Free plan includes up to 15 low-priority Android builds per month; quotas and build availability can change. See [Expo build profiles](https://docs.expo.dev/build/eas-json/) and [Expo plans](https://expo.dev/pricing).

EAS project: [Emergency112 mobile](https://expo.dev/accounts/siddharth29/projects/emergency112-mobile). An APK's API address is fixed at build time; confirm it matches the laptop's current Wi-Fi address before testing.

## Configure the phone API address

Find the laptop's private Wi-Fi IPv4 address with `ipconfig` and identify the active Wi-Fi adapter. Copy `mobile/.env.example` to `mobile/.env.local`, then set the local app environment value:

```json
EXPO_PUBLIC_API_BASE_URL=http://<YOUR-LAPTOP-WIFI-IPV4>:5081/api
```

Replace the placeholder with the actual IPv4 address. Do not use `localhost`, `127.0.0.1`, or an invented address. `mobile/.env.local` is ignored by Git and EAS uploads; do not commit it. `EXPO_PUBLIC_*` values are compiled into the app and are visible to its users, so never put passwords, API keys, or credentials in these settings.

The preview profile no longer stores a laptop address in `eas.json`. For an EAS cloud APK, configure `EXPO_PUBLIC_API_BASE_URL` in the Expo project's build environment. Configure the SOS destination there as `EXPO_PUBLIC_SOS_CALL_DEMO_NUMBER` only when the APK should enable SOS Call. These values are compiled into the APK, not embedded in the repository.

Start the API from the project root using the LAN profile:

```powershell
dotnet run --project backend/src/Emergency112.Api/Emergency112.Api.csproj --launch-profile "Emergency112 LAN"
```

If using the project-local .NET SDK, use `\.tools\dotnet\dotnet.exe` in place of `dotnet`. Verify the API from the laptop at `http://127.0.0.1:5081/api/health`. The phone must use `http://<YOUR-LAPTOP-WIFI-IPV4>:5081/api/health` and remain on the same Wi-Fi network. The API must stay running while testing. Windows Firewall may ask to allow the API on a private network; allow only the private network if prompted. Do not expose port 5081 to public networks.

The LAN profile binds the API to `0.0.0.0:5081` without changing the existing website profile or database. The demo uses HTTP on a private network, so traffic is not encrypted in transit. Do not use a real password on an untrusted network; switch to HTTPS before any deployment beyond a controlled demonstration.

## Install dependencies and run checks

From the `mobile/` folder:

```powershell
pnpm install
pnpm typecheck
pnpm test
$env:EXPO_PUBLIC_API_BASE_URL = 'http://<YOUR-LAPTOP-WIFI-IPV4>:5081/api'
pnpm exec expo export --platform android
```

Replace the IPv4 placeholder before running the export or starting a build. Expo SDK compatibility can be checked with `pnpm exec expo install --check`.

## Configure SOS Call

The SOS Call destination is configured once through `EXPO_PUBLIC_SOS_CALL_DEMO_NUMBER`, read by `mobile/src/sosCallConfig.ts`. For local use, copy `mobile/.env.example` to `mobile/.env.local` and enter an international E.164 number for a contact you control, beginning with `+` and the country code. Do not enter an emergency-service number or a number you do not have permission to call. The app normalizes spaces, parentheses, and hyphens and checks the E.164 digit length before enabling the action. General SOS and the eight category cards all use this same value. The trusted contact in Profile is separate and is never used as the SOS destination.

`mobile/.env.local` is ignored by Git and excluded from EAS source uploads. It is intentionally not part of this repository. For a cloud APK build that should include SOS Call, set `EXPO_PUBLIC_SOS_CALL_DEMO_NUMBER` in the Expo project's build environment outside the repository; the value is embedded in the resulting app and is not a secret. The checked-in `.env.example` is blank.

Tapping **SOS Call** first displays a real-call warning. Android then requests `CALL_PHONE` permission before any countdown begins. Android requires this permission because the app uses its direct-call intent to start a call without opening the dialer first. If permission is denied or Android cannot start the direct call, the app does not claim a call was made; it offers **Open phone dialer**, and you must review the number and tap **Call** in the phone app.

The permission is declared in `mobile/app.json` under `expo.android.permissions`. Rebuild and reinstall the Android APK after changing native permissions or adding the intent-launcher module; an existing APK and Expo Go do not gain the permission from JavaScript changes. The countdown is cancelled if you press Cancel, use Android Back, or leave the app before it reaches zero. It is never started automatically when the app opens or is restored.

The destination number is ordinary app configuration, not a secret, and it will be included in an APK configured for SOS Call. Review the build configuration before sharing an APK. Keep the `.easignore` exclusions for local environment files, databases, credentials, and signing material in place when uploading a build.

## Profile and database migration

Profile details are loaded from and saved to the authenticated `/api/profile` endpoints. The email is read-only in the app; full name, optional phone number, and optional trusted-contact name and number are saved in the existing Identity user record. Trusted contacts are optional and do not change the configured SOS call destination. Both profile endpoints require the Citizen role.

The backward-compatible EF Core migration `20261026153000_AddTrustedContactFields` adds two nullable columns to `AspNetUsers`; it does not recreate or reset the database or alter incident records. Development startup applies pending migrations automatically. For a deployment where automatic migrations are disabled, run from the project root with the local or system `dotnet-ef` 10.0.12 tool installed:

```powershell
dotnet ef database update --project backend/src/Emergency112.Api/Emergency112.Api.csproj --startup-project backend/src/Emergency112.Api/Emergency112.Api.csproj
```

## App branding

The primary Android icon and adaptive icon use the project-owned Emergency112 handset/signal mark. Source and generated assets are in `mobile/assets/`: `emergency112-mark.svg`, `icon.png`, `adaptive-icon-foreground.png`, and `splash.png`. Expo configuration applies these assets while keeping the existing application ID `com.emergency112.demo` so a compatible signed APK can update an existing install.

The signed-in bottom navigation has four destinations: Home, Report, History, and Profile. Home's main General SOS control and the eight other call categories share the same countdown and cancellation path. The report form keeps Submit disabled until category, a valid description, severity, and the simulation acknowledgement are complete.

## Sign in and build an APK

From `mobile/`, sign in to Expo in a terminal. The prompt may open a browser or request Expo credentials; complete it locally and do not paste passwords or tokens into chat:

```powershell
npm exec --yes --package=eas-cli@latest -- eas whoami
```

If you are not signed in, run `npm exec --yes --package=eas-cli@latest -- eas login` and complete its local sign-in flow. EAS may ask to create/link the Expo project and create Android signing credentials. Use the Expo-managed Android keystore for this demonstration and keep the keystore private.

Set the actual API URL in `eas.json`, then submit the build:

```powershell
npm exec --yes --package=eas-cli@latest -- eas build --platform android --profile preview
```

The EAS result includes a build page and, after success, an APK download URL. The build is not complete until EAS reports success and provides that artifact. Source is uploaded to Expo for this remote build; `.easignore` is the upload boundary and excludes the SQLite database and local credentials/configuration. Review that file if new sensitive files are added.

Download the APK link on the phone (or transfer the APK to it). If Android prompts, allow installation from the browser or file manager used to open the download, then tap **Install**. Open Emergency112 and sign in with an existing citizen account. Keep the laptop API running on the private network to create or retrieve incident data. Administrator status changes appear after refreshing history/detail; the app also refreshes an open detail view periodically.

## API and session behavior

The app uses the existing `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, and `/api/incidents` routes. It stores only the Identity session cookie in Android SecureStore; passwords are held only in screen memory and sent for the sign-in request. Each incident remains in the existing SQLite database. The app performs no local incident-store mirroring.

Cookie authentication over plain HTTP is limited to a trusted local demo network. The API is not exposed publicly by this profile intentionally. For deployment, use HTTPS and review native cookie/session behavior on target Android versions.

## Troubleshooting

- **API unreachable from the phone:** check both devices are on the same Wi-Fi; confirm the IPv4 address has not changed; check `/api/health` from the phone browser; ensure the API is running with the `Emergency112 LAN` profile; allow the port on the private Windows Firewall profile if prompted.
- **App says no API address is configured:** set `EXPO_PUBLIC_API_BASE_URL` in `eas.json` before building. The app deliberately rejects localhost and loopback addresses.
- **Sign-in works on the website but not the app:** check API connectivity and verify the account has the Citizen role. Admin accounts cannot use the citizen mobile flow.
- **Build requires Expo authentication:** run `npm exec --yes --package=eas-cli@latest -- eas login` in your local terminal and complete the Expo login yourself.
- **APK cannot install:** confirm EAS produced an APK with the `preview` profile; allow APK installation for the app used to open the downloaded file; check that the phone has storage and a supported Android version.
- **Build upload exclusions:** inspect `.easignore`; do not remove database, environment-file, credential, or signing-key exclusions.
