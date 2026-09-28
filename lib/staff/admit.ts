// The gate every /staff route handler opens with. Server-only.
//
// This lives in one file on purpose. It is the authorisation boundary for the
// whole portal, and a boundary copied into three route handlers is a boundary
// that will eventually be three slightly different boundaries, with the
// weakest of them deciding.
//
// Identity: Cloudflare Access fronts /staff/* at the edge and this re-verifies
// its signed JWT at the origin (lib/staff/access.ts) rather than trusting the
// edge alone or the unsigned cf-access-authenticated-user-email header. Reads
// are gated exactly as writes are: who is low on what, and what the store pays
// for it, is staff business.
//
// Three outcomes, and the order matters:
//
//   404  the portal is off in this environment. Answering 404 rather than 403
//        means a deploy of an unreviewed branch looks like nothing is there.
//   403  Access is configured and the caller did not present a valid token.
//   ok   admitted, carrying the email for the audit columns.
//
// In development there is no Access in front of the dev server, so there is no
// identity, and created_by / updated_by stay null.

import { NextResponse, type NextRequest } from "next/server";
import { verifyStaffAccess } from "@/lib/staff/access";
import { getStaffRuntime, type StaffRuntime } from "@/lib/staff/runtime";

export const NO_STORE = { "Cache-Control": "no-store" };

export type Denied = { response: NextResponse };

export type Admitted = {
  store: NonNullable<StaffRuntime["store"]>;
  purchases: NonNullable<StaffRuntime["purchases"]>;
  email: string | null;
};

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

export async function admitStaff(request: NextRequest): Promise<Admitted | Denied> {
  const { store, purchases, access } = getStaffRuntime();
  // Both stores are gated on the same flag, config and binding, so either one
  // missing means the portal is off. Checking both keeps that true by
  // construction rather than by comment.
  if (!store || !purchases) return { response: fail("unavailable", 404) };
  if (!access) return { store, purchases, email: null }; // development only
  const identity = await verifyStaffAccess(request.headers.get("cf-access-jwt-assertion"), access);
  if (!identity) return { response: fail("forbidden", 403) };
  return { store, purchases, email: identity.email };
}

export async function readJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    // A body that is not JSON is a client bug, not a condition to recover from.
    return null;
  }
}
