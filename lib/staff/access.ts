// Server-side verification of Cloudflare Access identity for /staff/*.
//
// Access, as the identity-aware proxy at the edge, already blocks anonymous
// requests before they reach the Worker. This module is the origin's own
// check of the same claim: it verifies the RS256 signature on the
// Cf-Access-Jwt-Assertion header against the team's published public keys
// (JWKS), plus issuer and the application's audience tag. Defense in depth:
// if routing ever changes, or the STAFF_PORTAL_ENABLED flag is flipped
// without Access in front, a header someone typed themselves verifies
// nothing and the request dies here.
//
// The bare cf-access-authenticated-user-email header is deliberately not
// trusted for anything: identity comes only from the verified token's email
// claim.

import { createRemoteJWKSet, jwtVerify } from "jose";

export type StaffAccessConfig = {
  /** The Zero Trust team domain, e.g. "example.cloudflareaccess.com". */
  teamDomain: string;
  /** The Access application's audience (AUD) tag. */
  aud: string;
};

// One JWKS per isolate, rebuilt if the team domain ever changes. jose caches
// the fetched keys and refetches on unknown-kid, so rotation needs nothing
// from us.
let cachedJwks: { domain: string; keys: ReturnType<typeof createRemoteJWKSet> } | null = null;

function jwksFor(teamDomain: string) {
  if (cachedJwks?.domain !== teamDomain) {
    cachedJwks = {
      domain: teamDomain,
      keys: createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`)),
    };
  }
  return cachedJwks.keys;
}

/**
 * Verifies the Access JWT and returns the authenticated email, or null for
 * anything short of a valid, non-expired token for this application. Null,
 * never a reason: the caller answers 403 either way, and the distinction
 * belongs in Access's own logs, not ours.
 */
export async function verifyStaffAccess(
  token: string | null,
  config: StaffAccessConfig
): Promise<{ email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwksFor(config.teamDomain), {
      issuer: `https://${config.teamDomain}`,
      audience: config.aud,
    });
    // Staff sign in with an email one-time PIN, so a token without an email
    // claim (a service token) is not a staff session.
    return typeof payload.email === "string" && payload.email ? { email: payload.email } : null;
  } catch {
    return null;
  }
}
