// Status state for the staff inventory board. GET lists every row that has
// ever been set (the client defaults everything else to 'in'); PATCH sets one
// item to an explicit status.
//
// PATCH takes the status, never "toggle": concurrent taps then converge on
// the tapped value instead of double-flipping. Both inputs are allowlisted
// against the catalog, so the table can only ever hold known ids and the
// three known statuses.
//
// Identity and authentication: Cloudflare Access fronts /staff/* at the edge,
// and this handler re-verifies its signed JWT before answering (see
// lib/staff/access.ts). Reads are gated the same as writes: who is low on
// what is staff business. In development there is no Access, so there is no
// identity, and updated_by stays null.

import { NextResponse, type NextRequest } from "next/server";
import { verifyStaffAccess } from "@/lib/staff/access";
import { isStaffItemId, isStaffStatus } from "@/lib/staff/catalog";
import { getStaffRuntime, type StaffRuntime } from "@/lib/staff/runtime";

// Live state: never prerender, never cache.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

type Denied = { response: NextResponse };
type Admitted = { store: NonNullable<StaffRuntime["store"]>; email: string | null };

async function admit(request: NextRequest): Promise<Admitted | Denied> {
  const { store, access } = getStaffRuntime();
  if (!store) {
    return { response: NextResponse.json({ error: "unavailable" }, { status: 404, headers: NO_STORE }) };
  }
  if (!access) return { store, email: null }; // development only; production always carries config
  const identity = await verifyStaffAccess(request.headers.get("cf-access-jwt-assertion"), access);
  if (!identity) {
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE }) };
  }
  return { store, email: identity.email };
}

export async function GET(request: NextRequest) {
  const admitted = await admit(request);
  if ("response" in admitted) return admitted.response;

  const rows = await admitted.store.list();
  const items: Record<string, { status: string; updatedBy: string | null; updatedAt: string }> = {};
  let latest: { updatedBy: string | null; updatedAt: string } | null = null;
  for (const row of rows) {
    items[row.id] = { status: row.status, updatedBy: row.updated_by, updatedAt: row.updated_at };
    if (!latest || row.updated_at > latest.updatedAt) {
      latest = { updatedBy: row.updated_by, updatedAt: row.updated_at };
    }
  }
  return NextResponse.json({ items, latest }, { headers: NO_STORE });
}

export async function PATCH(request: NextRequest) {
  const admitted = await admit(request);
  if ("response" in admitted) return admitted.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const { id, status } = (body ?? {}) as { id?: unknown; status?: unknown };
  if (typeof id !== "string" || !isStaffItemId(id)) {
    return NextResponse.json({ error: "unknown item" }, { status: 400, headers: NO_STORE });
  }
  if (!isStaffStatus(status)) {
    return NextResponse.json({ error: "unknown status" }, { status: 400, headers: NO_STORE });
  }

  await admitted.store.set(id, status, admitted.email);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
