#!/usr/bin/env bash
# Pre-flight DNS diff for the merosyogurt.com cutover.
#
# Cloudflare's nameservers answer for a zone the moment it is created, before
# any delegation change. So every record can be verified against them while
# GoDaddy is still authoritative and nothing is at risk. This diffs the two
# sets and fails loudly on any mail-affecting mismatch, which turns runbook
# step 11 (send and receive test mail) from a checkpoint we cannot run into a
# deterministic check we can.
#
# Usage: scripts/dns-preflight.sh <cloudflare-ns-hostname>
#   e.g. scripts/dns-preflight.sh gina.ns.cloudflare.com

set -euo pipefail

ZONE="merosyogurt.com"
OLD_NS="ns15.domaincontrol.com"
NEW_NS="${1:?usage: $0 <cloudflare-ns-hostname>}"

# name:type. Order matches the record table in docs/dns-cutover.md.
# @ A and www CNAME are listed but not fatal: Cloudflare replaces both when
# the Worker custom domain is bound, so they only need to match at mirror time.
RECORDS=(
  "@:A"
  "www:CNAME"
  "@:MX"
  "@:TXT"
  "_dmarc:TXT"
  "autodiscover:CNAME"
  "sip:CNAME"
  "lyncdiscover:CNAME"
  "msoid:CNAME"
  "litesrv._domainkey:CNAME"
  "email:CNAME"
  "_sip._tls:SRV"
  "_sipfederationtls._tcp:SRV"
)

# A mismatch on any of these breaks mail, Teams, or MailerLite.
is_mail_critical() {
  case "$1" in
    "@:MX"|"@:TXT"|"_dmarc:TXT"|"autodiscover:CNAME"|"sip:CNAME") return 0 ;;
    "lyncdiscover:CNAME"|"msoid:CNAME"|"litesrv._domainkey:CNAME") return 0 ;;
    "_sip._tls:SRV"|"_sipfederationtls._tcp:SRV") return 0 ;;
    *) return 1 ;;
  esac
}

query() { # ns, name, type -> sorted answer set, one record per line
  local ns="$1" name="$2" type="$3" fqdn
  [ "$name" = "@" ] && fqdn="$ZONE" || fqdn="$name.$ZONE"
  dig +short +time=5 +tries=2 "$type" "$fqdn" "@$ns" 2>/dev/null | sed 's/[[:space:]]*$//' | sort
}

fatal=0
warn=0

printf '%s\n' "Comparing $OLD_NS (live) against $NEW_NS (staged)"
printf '%s\n\n' "-----------------------------------------------------------"

for rec in "${RECORDS[@]}"; do
  name="${rec%%:*}"; type="${rec##*:}"
  old="$(query "$OLD_NS" "$name" "$type")"
  new="$(query "$NEW_NS" "$name" "$type")"

  if [ "$old" = "$new" ]; then
    if [ -z "$old" ]; then
      printf '  SKIP  %-28s %-6s (absent on both)\n' "$name" "$type"
    else
      printf '  ok    %-28s %-6s\n' "$name" "$type"
    fi
    continue
  fi

  if is_mail_critical "$rec"; then
    printf '  FAIL  %-28s %-6s MAIL CRITICAL\n' "$name" "$type"
    fatal=$((fatal + 1))
  else
    printf '  diff  %-28s %-6s\n' "$name" "$type"
    warn=$((warn + 1))
  fi
  printf '        godaddy   : %s\n' "${old:-<empty>}" | sed 's/$//'
  printf '        cloudflare: %s\n' "${new:-<empty>}"
done

printf '\n'
if [ "$fatal" -gt 0 ]; then
  printf '%s\n' "STOP. $fatal mail-critical mismatch(es). Fix the Cloudflare zone before touching nameservers."
  exit 1
fi
if [ "$warn" -gt 0 ]; then
  printf '%s\n' "$warn non-critical difference(s) above. Expected only for @ A and www CNAME once the Worker custom domain is bound."
fi
printf '%s\n' "No mail-critical mismatches. Safe to change nameservers at GoDaddy."
