#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"

# Use the project-local toolchain when it exists (see README).
if [ -z "${JAVA_HOME:-}" ] && [ -d "$ROOT/.tooling" ]; then
  JAVA_HOME="$(find "$ROOT/.tooling" -maxdepth 4 -type d -path "*/Contents/Home" -print -quit 2>/dev/null || true)"
fi

if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "JAVA_HOME is not set. Install JDK 17 and export JAVA_HOME first."
  echo "Example: export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
  exit 1
fi

if [ -z "${ANDROID_HOME:-}" ] && [ -d "$ROOT/.tooling/android-sdk" ]; then
  ANDROID_HOME="$ROOT/.tooling/android-sdk"
fi

if [ -z "${ANDROID_HOME:-}" ] && [ -f "$ANDROID_DIR/local.properties" ]; then
  ANDROID_HOME="$(sed -n 's/^sdk\.dir=//p' "$ANDROID_DIR/local.properties")"
fi

if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "$ANDROID_HOME/platforms/android-35" ]; then
  echo "Android SDK 35 not found. Install it and export ANDROID_HOME first."
  echo "Example: sdkmanager \"platforms;android-35\" \"build-tools;35.0.0\""
  exit 1
fi

export JAVA_HOME ANDROID_HOME
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

cd "$ANDROID_DIR"
./gradlew testDebugUnitTest assembleRelease

mkdir -p "$ROOT/dist"
cp app/build/outputs/apk/release/app-release.apk "$ROOT/dist/DailyEnergy-1.1.apk"

echo
echo "APK: $ROOT/dist/DailyEnergy-1.1.apk"
echo "Install with: adb install -r \"$ROOT/dist/DailyEnergy-1.1.apk\""
