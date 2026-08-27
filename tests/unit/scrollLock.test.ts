// The shared scroll lock: one body overflow capture across overlays, and Lenis
// stopped for exactly as long as any overlay is open.
import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshLock() {
  vi.resetModules();
  return import("@/lib/scrollLock");
}

describe("lockScroll", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  it("restores body overflow only when the last overlay releases", async () => {
    const { lockScroll } = await freshLock();
    document.body.style.overflow = "auto";
    const releaseA = lockScroll();
    const releaseB = lockScroll();
    expect(document.body.style.overflow).toBe("hidden");
    releaseA();
    expect(document.body.style.overflow).toBe("hidden");
    releaseB();
    expect(document.body.style.overflow).toBe("auto");
    releaseB();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("stops Lenis on the first lock and starts it on the last release", async () => {
    const { lockScroll, setScrollController } = await freshLock();
    const controller = { stop: vi.fn(), start: vi.fn() };
    setScrollController(controller);
    const releaseA = lockScroll();
    const releaseB = lockScroll();
    expect(controller.stop).toHaveBeenCalledTimes(1);
    releaseA();
    expect(controller.start).not.toHaveBeenCalled();
    releaseB();
    expect(controller.start).toHaveBeenCalledTimes(1);
  });

  it("stops a Lenis instance that mounts while an overlay is already open", async () => {
    const { lockScroll, setScrollController } = await freshLock();
    const release = lockScroll();
    const controller = { stop: vi.fn(), start: vi.fn() };
    setScrollController(controller);
    expect(controller.stop).toHaveBeenCalledTimes(1);
    release();
    expect(controller.start).toHaveBeenCalledTimes(1);
  });
});
