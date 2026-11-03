# Kanakkupulla SMS Sender (Android)

Our own free SMS gateway. This app runs on an always-on Android phone, polls your
Kanakkupulla site for queued messages, and sends each one through the phone's SIM.
No third-party service, no monthly cap — just your SIM's normal SMS.

## How it works
- Kanakkupulla queues each SMS (reminders, per-subscriber) in its outbox.
- This app polls `GET /api/sms/outbox` every ~20s with a pairing token, sends each
  message via the SIM, and reports the result to `POST /api/sms/outbox`.

## Build the APK
1. Install **Android Studio**.
2. Open this `sms-sender-app` folder (it syncs Gradle and creates the wrapper).
3. Build → **Build Bundle(s)/APK(s) → Build APK(s)**. The debug APK is at
   `app/build/outputs/apk/debug/app-debug.apk`.
   (Command line, if the wrapper exists: `./gradlew assembleDebug`.)

## Install on the shop phone
1. Copy the APK to the phone and install it (allow "install from unknown sources").
2. Open the app, **grant the SMS and notification permissions**.
3. In Kanakkupulla → the cable shop → Settings → SMS reminders → **Pair phone**. A QR code
   appears (shown once).
4. In the app tap **Scan QR to connect** and scan it. It fills in the address and token and
   starts by itself. A persistent "Kanakkupulla SMS" notification means it's running.
   (No Google Play Services? Type the address and the `kst_` token under "Or enter
   manually" and tap **Save and start**.)

## Keep it running
- Keep the phone **on, online, with the SIM in**.
- In Android Settings, set this app's battery usage to **Unrestricted** / disable
  battery optimization, so the service isn't killed.
- It restarts itself after a reboot.

## Notes
- `SEND_SMS` is a sensitive permission; this app is meant to be **sideloaded** on your
  own phone, not published to the Play Store.
- Re-pairing in Kanakkupulla issues a new token and stops the old one — update the app.
