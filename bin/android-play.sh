#!/usr/bin/env bash
# Arma el .aab de GradeHub para Google Play, firmado con la clave de subida.
#
#   npm run android:play
#
# La clave y su contraseña nunca entran al repo: el .aab sale de Gradle sin
# firmar y jarsigner lo firma acá, pidiendo la contraseña en la terminal. La
# clave es la misma del TWA (Play App Signing la reconoce como de subida); por
# defecto se busca donde la dejó Bubblewrap, o en GRADEHUB_KEYSTORE.
#
# Antes de subir: sube versionCode en android/app/build.gradle (Play rechaza
# uno que ya usó) y revisa que lo que va a cargar la app ya esté en main.
set -euo pipefail
cd "$(dirname "$0")/.."

KEYSTORE="${GRADEHUB_KEYSTORE:-$HOME/code/gradehub-android/gradehub-upload.keystore}"
if [ ! -f "$KEYSTORE" ]; then
  echo "No encuentro la clave de subida en $KEYSTORE. Indica dónde está con GRADEHUB_KEYSTORE=…"
  exit 1
fi
JAVA_HOME="$(/usr/libexec/java_home -v 21)"
export JAVA_HOME

# La de Play carga gradehub.cl: nunca la versión de prueba ni una build de QA.
unset GRADEHUB_SERVIDOR
npm run android:preparar
node -e '
  const c=require("./android/app/src/main/assets/capacitor.config.json");
  if(!c.server||c.server.url!=="https://gradehub.cl"){console.error("La app no carga https://gradehub.cl. No se arma.");process.exit(1);}'

(cd android && ./gradlew bundleRelease --console=plain -q)
AAB=android/app/build/outputs/bundle/release/app-release.aab

echo
echo "Firma con la clave de subida (alias upload). Pide la contraseña:"
"$JAVA_HOME/bin/jarsigner" -keystore "$KEYSTORE" -sigalg SHA256withRSA -digestalg SHA-256 "$AAB" upload

# La huella tiene que ser la de subida que está en .well-known/assetlinks.json.
# (jarsigner -verify no sirve de control: termina bien aunque no haya firma.)
HUELLA="$("$JAVA_HOME/bin/keytool" -printcert -jarfile "$AAB" 2>/dev/null | awk '/SHA256:/{print $2; exit}')"
if [ -z "$HUELLA" ]; then
  echo "El .aab quedó sin firma. No lo subas."
  exit 1
fi
if ! grep -qF "$HUELLA" .well-known/assetlinks.json; then
  echo "La firma ($HUELLA) no es la clave de subida de assetlinks.json. No lo subas."
  exit 1
fi
VERSION="$(awk '/versionCode/{print $2; exit}' android/app/build.gradle)"
echo
echo "Listo: $AAB"
echo "versionCode $VERSION · firmado con $HUELLA"
echo "Súbelo en Play Console → Producción → Crear versión."
