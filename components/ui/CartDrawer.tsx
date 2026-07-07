"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore } from "@/store/cartStore";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { CHECKOUT_ENABLED } from "@/lib/config";

const DRAWER_Z = 130;
const PANEL_DURATION = 0.5;
const PANEL_EASE = [0.16, 1, 0.3, 1] as const;

export function CartDrawer() {
  const router = useRouter();
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleCheckout = () => {
    closeCart();
    router.push("/checkout");
  };

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => closeButtonRef.current?.focus(), PANEL_DURATION * 1000);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, closeCart]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: DRAWER_Z }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: PANEL_DURATION * 0.6, ease: "easeOut" }}
            onClick={closeCart}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(41,45,42,0.35)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />

          {/* Panel — slides in from the right */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: PANEL_DURATION, ease: PANEL_EASE }}
            role="dialog"
            aria-modal="true"
            aria-label="Cart"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: "min(420px, 100vw)",
              background: "var(--color-cream)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-8px 0 32px rgba(41,45,42,0.18)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: "0.5px solid rgba(41,45,42,0.12)" }}
            >
              <h2
                className="font-headline text-midnight leading-none uppercase"
                style={{ fontSize: "1.35rem" }}
              >
                Your Cart
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close cart"
                onClick={closeCart}
                className="font-body-caps text-[10px] tracking-widest text-juniper px-3 py-2 transition-opacity hover:opacity-70"
              >
                Close
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {items.length === 0 ? (
                <p className="font-body-mixed text-sm text-juniper">No items yet.</p>
              ) : (
                <ul className="w-full space-y-3">
                  {items.map((item) => (
                    <CartLineItem key={item.lineId} item={item} />
                  ))}
                </ul>
              )}
            </div>

            {/* Footer — subtotal + checkout */}
            <div className="px-6 py-5" style={{ borderTop: "0.5px solid rgba(41,45,42,0.12)" }}>
              <div className="flex justify-between pb-4">
                <span className="font-body-caps text-[11px] text-midnight">Subtotal</span>
                <span className="font-body-caps text-[11px] text-midnight">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              {CHECKOUT_ENABLED ? (
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                  className="w-full font-body-caps text-[10px] tracking-widest px-10 py-3 transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--color-midnight)",
                    color: "var(--color-cream)",
                    border: "0.5px solid var(--color-midnight)",
                  }}
                >
                  Checkout
                </button>
              ) : (
                <div className="group relative">
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="w-full font-body-caps text-[10px] tracking-widest px-10 py-3 cursor-not-allowed"
                    style={{
                      border: "0.5px solid rgba(41,45,42,0.25)",
                      color: "rgba(41,45,42,0.35)",
                    }}
                  >
                    Checkout
                  </button>
                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-midnight px-2 py-1 font-body-caps text-[10px] text-cream opacity-0 transition-opacity group-hover:opacity-100">
                    Coming Soon
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
