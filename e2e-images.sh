#!/usr/bin/env sh
set -eu
set -o pipefail

# ======= CONFIG =======
BASE="${BASE:-http://localhost:3000}"
PRODUCT_ID="${PRODUCT_ID:-8}"
EMAIL="${EMAIL:-admin@local}"
PASSWORD="${PASSWORD:-admin123}"
IMG1="${IMG1:-/path/to/image.jpg}"   # pasar por variable de entorno (ruta POSIX o Windows)
# ======================

# Usar lo que haya disponible
CURL="${CURL:-curl}"
JQ="${JQ:-jq}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Falta dependencia: $1" >&2; exit 1; }; }
need "$CURL"
need "$JQ"

CJAR="$(mktemp)"
TMP2="$(mktemp 2>/dev/null || mktemp -t img2XXXXXX)"
cleanup() { rm -f "$CJAR" "$TMP2"; }
trap cleanup EXIT

say() { printf '\n\033[36m== %s ==\033[0m\n' "$*"; }
ok()  { printf '\033[32m✓ %s\033[0m\n' "$*"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*"; exit 1; }

[ -f "$IMG1" ] || die "No existe IMG1: $IMG1"
cp -f "$IMG1" "$TMP2"

# Convertir a ruta Windows cuando haga falta (para -F file=@ y -c/-b del cookiejar si se usa curl.exe)
toWIN() { command -v cygpath >/dev/null 2>&1 && cygpath -w "$1" || printf '%s' "$1"; }
IMG1_WIN="$(toWIN "$IMG1")"
TMP2_WIN="$(toWIN "$TMP2")"
CJAR_WIN="$(toWIN "$CJAR")"

say "Login"
HTTP_CODE="$("$CURL" -sS -o /dev/null -w '%{http_code}' -c "$CJAR_WIN" -b "$CJAR_WIN" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  "$BASE/api/auth/login")"
case "$HTTP_CODE" in 2*|3*) : ;; *) die "Login falló (HTTP $HTTP_CODE)";; esac

CSRF="$(awk '$6=="csrf"{print $7}' "$CJAR" | tail -n1)"
[ -n "$CSRF" ] || die "No pude extraer cookie CSRF"
ok "CSRF obtenido"

# Tag único
if command -v hexdump >/dev/null 2>&1; then
  TAG_HEX="$(hexdump -n4 -v -e '/1 "%02x"' /dev/urandom)"
else
  TAG_HEX="$(date +%s)"
fi
ALT_TAG="TEST-$TAG_HEX"
ALT1="$ALT_TAG-1"; ALT2="$ALT_TAG-2"

say "Upload (2)"
"$CURL" -sS -b "$CJAR_WIN" -c "$CJAR_WIN" -H "x-csrf-token: $CSRF" \
  -F "file=@$IMG1_WIN;type=image/jpeg" -F "alt=$ALT1" \
  "$BASE/api/admin/products/$PRODUCT_ID/images" | "$JQ" -e '.ok==true' >/dev/null
"$CURL" -sS -b "$CJAR_WIN" -c "$CJAR_WIN" -H "x-csrf-token: $CSRF" \
  -F "file=@$TMP2_WIN;type=image/jpeg" -F "alt=$ALT2" \
  "$BASE/api/admin/products/$PRODUCT_ID/images" | "$JQ" -e '.ok==true' >/dev/null
ok "Subidas ok"

list_all="$("$CURL" -sS -b "$CJAR_WIN" "$BASE/api/admin/products/$PRODUCT_ID/images")"
mine="$(printf '%s' "$list_all" | "$JQ" --arg TAG "$ALT_TAG" '[.items[] | select((.alt|tostring)|startswith($TAG))] | sort_by(.sortOrder)')"
count="$(printf '%s' "$mine" | "$JQ" 'length')"
[ "$count" -ge 2 ] || die "Esperaba 2 imágenes de prueba; encontré $count"
printf '%s\n' "$mine" | "$JQ" -r '.[] | "\(.id)\t\(.url)\t\(.alt)\t\(.sortOrder)"'

idA="$(printf '%s' "$mine" | "$JQ" -r '.[0].id')"
idB="$(printf '%s' "$mine" | "$JQ" -r '.[1].id')"

say "PUT move: down (sobre la primera)"
"$CURL" -sS -b "$CJAR_WIN" -H 'Content-Type: application/json' -H "x-csrf-token: $CSRF" \
  -X PUT -d "{\"move\":\"down\"}" \
  "$BASE/api/admin/products/$PRODUCT_ID/images/$idA" | "$JQ" -e '.ok==true' >/dev/null

mine2="$("$CURL" -sS -b "$CJAR_WIN" "$BASE/api/admin/products/$PRODUCT_ID/images" | "$JQ" --arg TAG "$ALT_TAG" '[.items[] | select((.alt|tostring)|startswith($TAG))] | sort_by(.sortOrder)')"
first_after_move="$(printf '%s' "$mine2" | "$JQ" -r '.[0].id')"
[ "$first_after_move" = "$idB" ] || die "move:down no surtió efecto"
printf '%s\n' "$mine2" | "$JQ" -r '.[] | "\(.id)\t\(.url)\t\(.alt)\t\(.sortOrder)"'

say "PUT reorder (invertir las dos)"
order_json="$(printf '%s' "$mine2" | "$JQ" -c '[.[1].id, .[0].id]')"
"$CURL" -sS -b "$CJAR_WIN" -H 'Content-Type: application/json' -H "x-csrf-token: $CSRF" \
  -X PUT -d "{\"order\":$order_json}" \
  "$BASE/api/admin/products/$PRODUCT_ID/images/reorder" | "$JQ" -e '.ok==true' >/dev/null

mine3="$("$CURL" -sS -b "$CJAR_WIN" "$BASE/api/admin/products/$PRODUCT_ID/images" | "$JQ" --arg TAG "$ALT_TAG" '[.items[] | select((.alt|tostring)|startswith($TAG))] | sort_by(.sortOrder)')"
printf '%s\n' "$mine3" | "$JQ" -r '.[] | "\(.id)\t\(.url)\t\(.alt)\t\(.sortOrder)"'
first_id="$(printf '%s' "$mine3" | "$JQ" -r '.[0].id')"

say "PUT alt (actualizar ALT de la primera)"
newAlt="${ALT_TAG}-1-updated"
"$CURL" -sS -b "$CJAR_WIN" -H 'Content-Type: application/json' -H "x-csrf-token: $CSRF" \
  -X PUT -d "{\"alt\":\"$newAlt\"}" \
  "$BASE/api/admin/products/$PRODUCT_ID/images/$first_id" \
  | "$JQ" -e --arg alt "$newAlt" '.ok==true and .item.alt==$alt' >/dev/null
ok "ALT actualizado"

mine4="$("$CURL" -sS -b "$CJAR_WIN" "$BASE/api/admin/products/$PRODUCT_ID/images" | "$JQ" --arg TAG "$ALT_TAG" '[.items[] | select((.alt|tostring)|startswith($TAG))] | sort_by(.sortOrder)')"
printf '%s\n' "$mine4" | "$JQ" -r '.[] | "\(.id)\t\(.url)\t\(.alt)\t\(.sortOrder)"'

say "DELETE (limpieza)"
# Extraer IDs, quitar \r y líneas vacías para evitar URLs malformadas
ids="$(printf '%s' "$mine4" | "$JQ" -r '.[].id' | tr -d '\r' | awk 'NF')"
for id in $ids; do
  id_clean="$(printf '%s' "$id" | tr -d '\r\n')"
  "$CURL" -sS -b "$CJAR_WIN" -H "x-csrf-token: $CSRF" \
    -X DELETE "$BASE/api/admin/products/$PRODUCT_ID/images/$id_clean" \
    | "$JQ" -e '.ok==true' >/dev/null
done

left="$("$CURL" -sS -b "$CJAR_WIN" "$BASE/api/admin/products/$PRODUCT_ID/images" | "$JQ" --arg TAG "$ALT_TAG" '[.items[] | select((.alt|tostring)|startswith($TAG))] | length')"
[ "$left" -eq 0 ] || die "Cleanup falló: quedan $left imágenes de prueba"
ok "Pruebas OK (upload, list, move, reorder, alt, delete)"