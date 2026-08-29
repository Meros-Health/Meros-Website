#!/usr/bin/env bash
# Post-cutover verification for merosyogurt.com.
#
# Runs the whole of runbook step 18 against whichever host you point it at, so
# the same checks can be run on the Worker before the switch and on the real
# apex after it. Compares nothing to nothing: every assertion is explicit, and
# the script exits nonzero if any of them fail.
#
# Usage:
#   scripts/cutover-verify.sh                          # the live apex
#   scripts/cutover-verify.sh meros-website.merosyogurt.workers.dev

set -uo pipefail

HOST="${1:-merosyogurt.com}"
BASE="https://$HOST"
SITE="https://merosyogurt.com"

pass=0
fail=0

ok()   { printf '  ok    %s\n' "$1"; pass=$((pass + 1)); }
bad()  { printf '  FAIL  %s\n' "$1"; printf '        %s\n' "$2"; fail=$((fail + 1)); }

# code <path> <expected>
code() {
  local path="$1" want="$2" got
  got=$(curl -sS -o /dev/null -w '%{http_code}' -m 20 "$BASE$path" 2>/dev/null)
  if [ "$got" = "$want" ]; then ok "$path -> $got"
  else bad "$path" "expected $want, got ${got:-no response}"; fi
}

# redirect <path> <expected-location-suffix>
redirect() {
  local path="$1" want="$2" got loc
  got=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' -m 20 "$BASE$path" 2>/dev/null)
  loc="${got#* }"
  case "$got" in
    30[178]*) [ "${loc%$want}" != "$loc" ] && ok "$path -> ${got%% *} $want" \
                || bad "$path" "redirects to $loc, expected something ending $want" ;;
    *) bad "$path" "expected a redirect, got: ${got:-no response}" ;;
  esac
}

# lands <path> <expected-final-suffix>
# Follows the whole chain. The agency site's indexed URLs all carry a trailing
# slash, and Next strips that with its own 308 before the redirect rule can
# match, so every one of them lands in two hops rather than one. That is fine
# (Google follows chains) but it means a single-hop assertion is wrong.
lands() {
  local path="$1" want="$2" out final hops
  out=$(curl -sS -o /dev/null -m 25 -L -w '%{num_redirects} %{url_effective} %{http_code}' "$BASE$path" 2>/dev/null)
  hops="${out%% *}"; final=$(printf '%s' "$out" | cut -d' ' -f2); code="${out##* }"
  if [ "${final%$want}" != "$final" ] && [ "$code" = "200" ]; then
    ok "$path -> $want (${hops} hops)"
  else
    bad "$path" "landed on ${final:-nothing} with code ${code:-none}, expected something ending $want"
  fi
}

# contains <path> <needle> <label>
contains() {
  local path="$1" needle="$2" label="$3"
  if curl -sS -m 20 "$BASE$path" 2>/dev/null | grep -qF "$needle"; then ok "$label"
  else bad "$label" "$path did not contain: $needle"; fi
}

printf '%s\n\n' "Verifying $BASE"

printf '%s\n' "Routes"
for p in / /order /build /privacy /terms /checkout /robots.txt /sitemap.xml; do
  code "$p" 200
done
code /this-route-does-not-exist 404

printf '\n%s\n' "Legacy URLs from the agency site"
redirect /our-menu       /order
redirect /build-a-bowl   /build
redirect /about-us       "/#about"
redirect /privacy-policy /privacy
redirect /contact        "/#footer"
# The indexed forms all carry a trailing slash, so check them end to end.
lands /our-menu/        /order
lands /build-a-bowl/    /build
lands /privacy-policy/  /privacy

printf '\n%s\n' "SEO"
for pair in "/:$SITE" "/order:$SITE/order" "/build:$SITE/build" "/privacy:$SITE/privacy" "/terms:$SITE/terms"; do
  path="${pair%%:*}"; want="${pair#*:}"
  got=$(curl -sS -m 20 "$BASE$path" 2>/dev/null \
        | grep -o '<link rel="canonical" href="[^"]*"' | head -1 | sed 's/.*href="//;s/"$//')
  if [ "$got" = "$want" ]; then ok "$path canonical -> $want"
  else bad "$path canonical" "expected $want, got ${got:-none}"; fi
done
contains /checkout 'noindex' "/checkout is noindex"
contains /robots.txt "Sitemap: $SITE/sitemap.xml" "robots.txt names the live sitemap"
contains /sitemap.xml "<loc>$SITE/order</loc>" "sitemap names the live domain"

printf '\n%s\n' "Transport"
if [ "$HOST" = "merosyogurt.com" ]; then
  # Only meaningful on the real domain. workers.dev answers plain http by
  # design; "Always Use HTTPS" is a zone setting and lives at runbook step 16.
  h=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' -m 20 "http://$HOST/" 2>/dev/null)
  case "$h" in
    30[178]*https://*) ok "http -> https ($h)" ;;
    200*) bad "http -> https" "http served 200 without redirecting. Is Always Use HTTPS on? Runbook step 16." ;;
    *) bad "http -> https" "got: ${h:-no response}" ;;
  esac

  w=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' -m 20 "https://www.$HOST/" 2>/dev/null)
  case "$w" in 30[178]*"https://merosyogurt.com"*) ok "www -> apex ($w)" ;; *) bad "www -> apex" "got: ${w:-no response}" ;; esac

  printf '\n%s\n' "Mail records survived the move"
  mx=$(dig +short MX "$HOST" | sort | paste -sd, -)
  case "$mx" in *mail.protection.outlook.com*) ok "MX -> $mx" ;; *) bad "MX" "got: ${mx:-none}" ;; esac
  dkim=$(dig +short CNAME litesrv._domainkey."$HOST")
  case "$dkim" in *mlsend.com*) ok "MailerLite DKIM -> $dkim" ;; *) bad "MailerLite DKIM" "got: ${dkim:-none}" ;; esac
  for sel in selector1 selector2; do
    msdkim=$(dig +short CNAME "$sel"._domainkey."$HOST")
    case "$msdkim" in *dkim.mail.microsoft*) ok "Microsoft 365 DKIM $sel -> $msdkim" ;; *) bad "Microsoft 365 DKIM $sel" "got: ${msdkim:-none}" ;; esac
  done
  spf=$(dig +short TXT "$HOST" | grep -c 'v=spf1')
  [ "$spf" -eq 1 ] && ok "exactly one SPF record" || bad "SPF" "found $spf SPF records, must be exactly 1"
  spfrec=$(dig +short TXT "$HOST" | grep 'v=spf1')
  case "$spfrec" in *spf.protection.outlook.com*) ok "SPF includes Outlook" ;; *) bad "SPF includes Outlook" "got: ${spfrec:-none}" ;; esac
  dmarc=$(dig +short TXT _dmarc."$HOST" | grep -c 'v=DMARC1')
  [ "$dmarc" -eq 1 ] && ok "DMARC present" || bad "DMARC" "found $dmarc DMARC records"
fi

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1
