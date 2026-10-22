# Daily Energy — Übersicht widget

A macOS desktop widget for [Übersicht](https://tracesof.net/uebersicht/).
It is a self-contained `.jsx` file: the calculation core is bundled into it, so
no Node process or server is required at runtime.

## Install

```bash
brew install --cask ubersicht
./scripts/install-uebersicht.sh
```

The installer copies `DailyEnergy.widget` into:

```
~/Library/Application Support/Übersicht/widgets/
```

Übersicht watches that folder and loads the widget automatically. If it does
not appear, choose **Refresh all Widgets** from the Übersicht menu.

## Set your birthday (Life Path / Personal Year / Month)

You can set it directly in the widget:

1. Enable **Interaction** in the Übersicht menu-bar settings. If macOS prompts
   for Accessibility access, allow it.
2. Click **Set** / **Edit** next to **Birthday**.
3. Enter `YYYY-MM-DD` (for example `2003-05-23`) and press **Save**.

The value is stored in the widget's `localStorage`, so it survives reloads and
widget updates. The build-time value below is only the fallback for a fresh
install. Create `uebersicht/birthday.txt` (gitignored) with `YYYY-MM-DD`:

```bash
echo "2003-05-23" > uebersicht/birthday.txt
npm run build:uebersicht
./scripts/install-uebersicht.sh
```

Or pass it directly:

```bash
BIRTHDAY=2003-05-23 npm run build:uebersicht
./scripts/install-uebersicht.sh
```

The year unlocks Life Path. Personal Year changes on that date each year;
Personal Month changes on that day each month and uses only the month and day.
Legacy `MM-DD` values still drive the personal cycles, but Life Path will ask
for the birth year. Without a birthday, the cards show **—** and **Set
birthday**.

If you edit the widget template, rebuild and reinstall:

```bash
npm install
npm run build:uebersicht
./scripts/install-uebersicht.sh
```

The build embeds a minified IIFE of `src/numerology-core.ts` so the widget stays
in sync with the web and Android versions.

## Behavior

- Refreshes once a minute, so the date rolls over at local midnight.
- Shows Life Path, today's primary (full-date) energy, secondary energy,
  combined key, Universal Year, Universal Month, Personal Year, Personal Month,
  and the current month's calendar.
- The calendar is Sunday-first, covers 4–6 weeks, and highlights today.
- Personal Month uses the month in which the current birthday-to-birthday cycle
  began. For a May 23 birthday, the Sep 23–Oct 23 cycle uses September:
  11 + 9 = 20 → 11. The next cycle starts Oct 23.
- Positioned 28 px from the top-right corner; change `className` in
  `widget.template.jsx` to move it.
- Footer reads **GG33**.

## Uninstall

```bash
rm -rf "$HOME/Library/Application Support/Übersicht/widgets/DailyEnergy.widget"
```
