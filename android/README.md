# Daily Energy — Android widgets

Two native Android home-screen widgets plus a full-screen app. It is a small
Kotlin app with no AndroidX or Compose runtime dependencies; the widget UI uses
`RemoteViews`.

- **Min Android:** 8.0 (API 26)
- **Target/compile SDK:** 35
- **Widgets:**
  - **Daily Energy** — 4×2 cells, resizable. Today's primary, secondary, and
    combined energy. Resize to three or more rows to reveal a compact
    `UY / UM / PY / PM` line.
  - **Daily Energy Calendar** — 4×4 cells, resizable. A navigable month
    calendar, today's energy, the four timing cycles, and a Sunday-first grid.
- **Birthday:** set it in the app. It drives Personal Year and Personal Month;
  only the month and day are used.
- **Updates:** alarm at 12:01 a.m. local time, plus a 30-minute system fallback
- **Tap a card:** opens the full-screen app
- **Tap ↻:** refreshes immediately
- **Calendar month:** tap ‹ / › to move between months; tap the month label to
  return to the current month

## Build

Requirements: JDK 17 and Android SDK platform 35 + build-tools 35.0.0.

```bash
cd android
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk
./gradlew testDebugUnitTest assembleRelease
```

Or from the repo root, with the same environment:

```bash
npm run build:android
```

The APK is copied to `dist/DailyEnergy-1.1.apk`.

If you have Android Studio installed, you can also open the `android/` folder
directly and build the `app` module.

## Install on a Pixel / Android phone

```bash
adb install -r dist/DailyEnergy-1.1.apk
```

Or transfer the APK to the phone and tap it, allowing "Install unknown apps"
for the file manager or browser you used.

1. Open **Daily Energy** and tap **Set birthday**. Pick your full birth date.
   The year drives Life Path; the month and day anchor the personal cycles. You
   can clear it at any time with **Clear**.
2. Long-press an empty area of the home screen → **Widgets** →
   **Daily Energy**.
3. Add **Daily Energy** (4×2) and/or **Daily Energy Calendar** (4×4).

The app shows the four timing cycles and their date ranges:

- **Universal Year** — changes January 1
- **Universal Month** — changes on the 1st
- **Personal Year** — changes on your birthday
- **Personal Month** — changes on your birth day each month

Until a birthday is set, Personal Year and Personal Month show **—**. The
calendar widget and app update immediately when you set or clear the birthday.

The APK in `dist/` is signed with the local debug key so it can be sideloaded.
That is fine for personal use, but replace the signing config before publishing
to Google Play.

## Calculation tests

```bash
./gradlew testDebugUnitTest
```

The Kotlin engine mirrors `src/numerology-core.ts`; the fixtures match the web
test suite, including:

- the day-28 secondary rule (`28 → 1`)
- the 20/2 rule for full-date energy
- the Sunday-first 4–6 week calendar grid
- Timing-cycle reductions: `2 → 11`, 11/22/33 preserved, `28 → 1` for cycles
- Personal Year changing on the birthday
- Personal Month changing on the birth day (for a May 23 birthday, the
  Sep 23–Oct 23 cycle uses September: 11 + 9 = 20 → 11)

27 unit tests currently cover the engine, calendar, cycles, and Life Path.
