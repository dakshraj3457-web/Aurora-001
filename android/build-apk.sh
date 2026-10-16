#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
BUILD_DIR="$ANDROID_DIR/build"
SRC_DIR="$ANDROID_DIR/src"
RES_DIR="$ANDROID_DIR/res"
MANIFEST="$ANDROID_DIR/AndroidManifest.xml"
KEYSTORE="$ANDROID_DIR/aurora-release.jks"
KEY_ALIAS="aurora01"
KEY_PASS="aurora2026pass"

ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"
DX_TOOL="/usr/lib/android-sdk/build-tools/debian/dx"
if [ ! -f "$DX_TOOL" ]; then
  DX_TOOL="/usr/bin/dalvik-exchange"
fi

# Check if environment supports Android APK building
if [ ! -f "$ANDROID_JAR" ] || ! command -v javac >/dev/null 2>&1 || ! command -v aapt >/dev/null 2>&1; then
  echo "================================================================="
  echo "[INFO] Android build toolchain not found in current host environment."
  echo "[INFO] Skipping APK compilation. Keeping pre-built APK if available."
  echo "================================================================="
  exit 0
fi

echo "=== [1/7] Building Web Production Assets ==="
cd "$ROOT_DIR"
npx vite build

echo "=== [2/7] Preparing Android Build Tree ==="
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/classes"
mkdir -p "$BUILD_DIR/assets"
mkdir -p "$ROOT_DIR/public"

# Copy built web app to android assets
cp -r "$ROOT_DIR/dist/"* "$BUILD_DIR/assets/"

echo "=== [3/7] Compiling Java Source ==="
javac -source 8 -target 8 \
  -bootclasspath "$ANDROID_JAR" \
  -d "$BUILD_DIR/classes" \
  "$SRC_DIR/com/aurora/groundstation/MainActivity.java"

echo "=== [4/7] Dexing Bytecode ==="
"$DX_TOOL" --dex --output="$BUILD_DIR/classes.dex" "$BUILD_DIR/classes"

echo "=== [5/7] Packaging APK with AAPT ==="
aapt package -f \
  -M "$MANIFEST" \
  -S "$RES_DIR" \
  -A "$BUILD_DIR/assets" \
  -I "$ANDROID_JAR" \
  -F "$BUILD_DIR/unaligned.apk"

cd "$BUILD_DIR"
aapt add unaligned.apk classes.dex

echo "=== [6/7] Aligning APK ==="
zipalign -f -p 4 unaligned.apk aligned.apk

echo "=== [7/7] Signing APK with Release Key ==="
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEY_PASS" -keypass "$KEY_PASS" \
    -dname "CN=AURORA-01 Mission, OU=Ground Station, O=Aurora Aerospace, L=Pasadena, ST=CA, C=US"
fi

apksigner sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:"$KEY_PASS" \
  --key-pass pass:"$KEY_PASS" \
  --out "$BUILD_DIR/aurora-01.apk" \
  aligned.apk

apksigner verify --verbose "$BUILD_DIR/aurora-01.apk"

# Copy final APK to public, dist and android root
cp "$BUILD_DIR/aurora-01.apk" "$ROOT_DIR/public/aurora-01.apk"
cp "$BUILD_DIR/aurora-01.apk" "$ROOT_DIR/dist/aurora-01.apk"
cp "$BUILD_DIR/aurora-01.apk" "$ANDROID_DIR/aurora-01-ground-station.apk"

APK_SIZE=$(du -h "$ROOT_DIR/public/aurora-01.apk" | cut -f1)
echo "=== BUILD SUCCESSFUL ==="
echo "APK generated: $ROOT_DIR/public/aurora-01.apk ($APK_SIZE)"
