#!/usr/bin/env node
// Repeatable Core Web Vitals measurement, so the numbers in the performance
// plan can be shown to have moved rather than remembered.
//
//   node scripts/web-vitals.mjs https://merosyogurt.com [/ /order /build]
//   node scripts/web-vitals.mjs http://localhost:3011 --json out.json --top 20
//
// Three profiles per route: desktop 1440x900 unthrottled; an iPhone 14 on
// Chrome DevTools' "Fast 4G" (4 Mbps down, 20 ms RTT, 2x CPU), which is
// roughly a phone on Vancouver LTE; and the same phone on Lighthouse's
// mobile profile (1.6 Mbps down, 150 ms RTT, 4x CPU), the industry lab
// baseline and the harsher of the two. The mobile figures are the ones the
// plan holds the work to.

import { chromium, devices } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const jsonIndex = args.indexOf("--json");
const jsonPath = jsonIndex >= 0 ? args.splice(jsonIndex, 2)[1] : null;
const topIndex = args.indexOf("--top");
const top = topIndex >= 0 ? Number(args.splice(topIndex, 2)[1]) : 5;
const [origin, ...routeArgs] = args;
if (!origin) {
  console.error("usage: node scripts/web-vitals.mjs <origin> [routes...] [--json file]");
  process.exit(1);
}
const routes = routeArgs.length ? routeArgs : ["/", "/order", "/build"];

const mbps = (n) => (n * 1024 * 1024) / 8;
const FAST_4G = { latency: 20, downloadThroughput: mbps(4), uploadThroughput: mbps(3), cpu: 2 };
const LIGHTHOUSE_MOBILE = { latency: 150, downloadThroughput: mbps(1.6), uploadThroughput: mbps(0.75), cpu: 4 };
const SETTLE_MS = 12_000; // time the page gets after load before metrics are read

const PROFILES = [
  { name: "desktop", context: { viewport: { width: 1440, height: 900 } }, throttle: null },
  { name: "iphone-fast-4g", context: { ...devices["iPhone 14"] }, throttle: FAST_4G },
  { name: "iphone-slow-4g", context: { ...devices["iPhone 14"] }, throttle: LIGHTHOUSE_MOBILE },
];

// Installed before any page script: observers must exist before the first
// paint to see it.
const OBSERVER = `
  window.__vitals = { lcp: 0, cls: 0, fcp: 0 };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__vitals.lcp = e.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.name === "first-contentful-paint") window.__vitals.fcp = e.startTime;
  }).observe({ type: "paint", buffered: true });
`;

function readMetrics(top) {
  const nav = performance.getEntriesByType("navigation")[0];
  const resources = performance.getEntriesByType("resource");
  const images = resources.filter((r) => r.initiatorType === "img" || /\.(webp|avif|png|jpe?g|gif|svg)(\?|$)/i.test(r.name));
  const bytes = (list) => list.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  const largest = [...resources]
    .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
    .slice(0, top)
    .map((r) => ({ name: r.name.replace(location.origin, ""), kb: Math.round((r.transferSize || 0) / 1024) }));
  return {
    ...window.__vitals,
    load: nav ? nav.loadEventEnd : 0,
    transferKb: Math.round((bytes(resources) + (nav?.transferSize || 0)) / 1024),
    imageCount: images.length,
    imageKb: Math.round(bytes(images) / 1024),
    largest,
  };
}

async function measure(browser, profile, route) {
  const context = await browser.newContext(profile.context);
  const page = await context.newPage();
  await page.addInitScript(OBSERVER);
  const cdp = await context.newCDPSession(page);
  if (profile.throttle) {
    const { cpu, ...network } = profile.throttle;
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, ...network });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  }
  await page.goto(origin + route, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(SETTLE_MS);
  const metrics = await page.evaluate(readMetrics, top);
  await context.close();
  return { profile: profile.name, route, ...metrics };
}

const ms = (v) => `${Math.round(v)}ms`;
const browser = await chromium.launch();
const results = [];
try {
  for (const route of routes) {
    for (const profile of PROFILES) {
      const r = await measure(browser, profile, route);
      results.push(r);
      console.log(
        `${r.profile.padEnd(15)} ${r.route.padEnd(8)} FCP ${ms(r.fcp).padStart(8)}  LCP ${ms(r.lcp).padStart(8)}  ` +
          `CLS ${r.cls.toFixed(4)}  load ${ms(r.load).padStart(8)}  ${String(r.transferKb).padStart(6)} KB total  ` +
          `${String(r.imageKb).padStart(6)} KB in ${r.imageCount} images`
      );
    }
  }
} finally {
  await browser.close();
}

console.log("\nLargest transfers per run:");
for (const r of results) {
  console.log(`  ${r.profile} ${r.route}: ` + r.largest.map((l) => `${l.name} (${l.kb} KB)`).join(", "));
}
if (jsonPath) {
  await writeFile(jsonPath, JSON.stringify({ origin, measuredAt: new Date().toISOString(), results }, null, 2) + "\n");
  console.log(`\nwritten ${jsonPath}`);
}
