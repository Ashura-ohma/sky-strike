#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
# Use either installed Android SDK tools or equivalent AOSP/Debian tools.
: "${AAPT:=aapt}" "${ZIPALIGN:=zipalign}" "${JAVA:=java}"
: "${ANDROID_JAR:?Set ANDROID_JAR to the Android SDK platform android.jar}"
: "${FRAMEWORK_RES:=$ANDROID_JAR}"
: "${D8_JAR:?Set D8_JAR to r8.jar from Google Maven repository}"
: "${APKSIGNER_JAR:?Set APKSIGNER_JAR to apksigner.jar}"
: "${SIGNING_KEYSTORE:?Set SIGNING_KEYSTORE to a private signing key outside the repository}"
: "${SIGNING_PASSWORD_FILE:?Set SIGNING_PASSWORD_FILE to a private password file}"
mkdir -p build/classes build/dex
python3 prepare-assets.py
"$AAPT" package -f -M AndroidManifest.xml -S res -A build/assets -I "$FRAMEWORK_RES" -F build/unsigned.apk
"$JAVA" com.sun.tools.javac.Main -source 8 -target 8 -classpath "$ANDROID_JAR" -d build/classes src/io/skystrike/game/MainActivity.java
mapfile -t CLASSES < <(find build/classes -name '*.class')
"$JAVA" -cp "$D8_JAR" com.android.tools.r8.D8 --min-api 26 --lib "$ANDROID_JAR" --output build/dex "${CLASSES[@]}"
(cd build/dex && zip -q -u ../unsigned.apk classes.dex)
"$ZIPALIGN" -f 4 build/unsigned.apk build/aligned.apk
"$JAVA" -jar "$APKSIGNER_JAR" sign --ks "$SIGNING_KEYSTORE" --ks-pass "file:$SIGNING_PASSWORD_FILE" --out build/sky-strike-1.0.0.apk build/aligned.apk
"$JAVA" -jar "$APKSIGNER_JAR" verify --verbose --print-certs build/sky-strike-1.0.0.apk
"$ZIPALIGN" -c 4 build/sky-strike-1.0.0.apk
"$AAPT" dump badging build/sky-strike-1.0.0.apk
