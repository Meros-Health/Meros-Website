// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

// The staff routes have exactly one security property worth a test: in
// production they fail CLOSED. No flag, no Access config, or no database
// each mean "the portal does not exist", never "the portal is open with
// fewer guards". These tests pin every branch of that decision.

const ctx = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: ctx.env }),
}));

import { getStaffRuntime } from "@/lib/staff/runtime";

const fakeDb = { prepare: () => ({ bind: () => ({}), run: async () => ({}), all: async () => ({ results: [] }) }) };
const fullEnv = {
  ORDERS_DB: fakeDb,
  STAFF_PORTAL_ENABLED: "true",
  STAFF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com",
  STAFF_ACCESS_AUD: "aud-tag",
};

afterEach(() => {
  vi.unstubAllEnvs();
  ctx.env = {};
});

describe("staff runtime in production", () => {
  const prod = () => vi.stubEnv("NODE_ENV", "production");

  it("is off without the flag, whatever else exists", () => {
    prod();
    ctx.env = { ...fullEnv, STAFF_PORTAL_ENABLED: undefined };
    expect(getStaffRuntime().store).toBeNull();
  });

  it("is off with the flag but no Access config", () => {
    prod();
    ctx.env = { ...fullEnv, STAFF_ACCESS_TEAM_DOMAIN: undefined };
    expect(getStaffRuntime().store).toBeNull();
    ctx.env = { ...fullEnv, STAFF_ACCESS_AUD: undefined };
    expect(getStaffRuntime().store).toBeNull();
  });

  it("is off with the flag but no database, never an in-memory stand-in", () => {
    prod();
    ctx.env = { ...fullEnv, ORDERS_DB: undefined };
    expect(getStaffRuntime().store).toBeNull();
  });

  it("is on only with flag, Access config, and the database together", () => {
    prod();
    ctx.env = { ...fullEnv };
    const runtime = getStaffRuntime();
    expect(runtime.store).not.toBeNull();
    expect(runtime.access).toEqual({ teamDomain: "example.cloudflareaccess.com", aud: "aud-tag" });
  });
});

describe("staff runtime in development", () => {
  it("serves the memory store without bindings and no Access requirement", () => {
    vi.stubEnv("NODE_ENV", "development");
    ctx.env = {};
    const runtime = getStaffRuntime();
    expect(runtime.store).not.toBeNull();
    expect(runtime.access).toBeNull();
  });
});
