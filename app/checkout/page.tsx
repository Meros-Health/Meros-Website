"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useCartHydrated } from "@/store/useCartHydrated";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { submitCheckout, type CheckoutFormState } from "@/app/actions/checkout";
import { makeIdempotencyKey } from "@/lib/checkout/idempotency";
import { linesMissingBase, toCheckoutLines } from "@/lib/checkout/lines";
import { LINE_MESSAGES, MISSING_BASE_HINT, PICKUP_ONLY_NOTE } from "@/lib/checkout/messages";
import { CHECKOUT_ENABLED } from "@/lib/config";

const LAST_ORDER_KEY = "meros-last-order";
// One key per purchase attempt, kept in sessionStorage so a reload after a
// hung submit still dedupes against an order that may already exist.
const IDEMPOTENCY_KEY = "meros-checkout-key";

function loadIdempotencyKey(): string {
  try {
    const existing = sessionStorage.getItem(IDEMPOTENCY_KEY);
    if (existing) return existing;
  } catch {
    // Storage unavailable: a per-mount key still covers same-page retries.
  }
  const key = makeIdempotencyKey();
  try {
    sessionStorage.setItem(IDEMPOTENCY_KEY, key);
  } catch {
    // Best effort only.
  }
  return key;
}

function clearIdempotencyKey(): void {
  try {
    sessionStorage.removeItem(IDEMPOTENCY_KEY);
  } catch {
    // Nothing to recover.
  }
}

// Which errors a cart edit can fix, and which need the current menu.
const RELOAD_CODES = new Set(["price-changed", "unavailable", "invalid"]);

/**
 * The stored confirmation is for the customer who reloads (or comes Back to)
 * the success screen. A fresh visit to /checkout with an empty cart is a new
 * intent, and goes to the menu.
 */
function arrivedByReload(): boolean {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === "reload" || nav?.type === "back_forward";
  } catch {
    return false;
  }
}

function readLastOrder(): CheckoutFormState | null {
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutFormState;
    return parsed.status === "success" ? parsed : null;
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const openCart = useCartStore((s) => s.openCart);

  const [state, setState] = useState<CheckoutFormState>({ status: "idle", message: "" });
  const [pending, setPending] = useState(false);
  // In-flight guard: the disabled attribute only applies after the next
  // render, so a second submit dispatched in the same tick needs the ref.
  const submittingRef = useRef(false);
  // Wait for the persisted cart to rehydrate before deciding anything,
  // otherwise a fresh page load always sees an empty cart and redirects.
  const hydrated = useCartHydrated();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!CHECKOUT_ENABLED) {
      router.replace("/menu");
      return;
    }
    if (!hydrated || state.status === "success") return;
    if (items.length > 0) return;

    // Empty cart: restore the last confirmation when the user refreshed the
    // success screen (or came Back to it); a new visit clears it and goes to
    // the menu.
    const lastOrder = readLastOrder();
    if (lastOrder && arrivedByReload()) {
      setState(lastOrder);
      return;
    }
    try {
      sessionStorage.removeItem(LAST_ORDER_KEY);
    } catch {
      // Nothing to clear.
    }
    router.replace("/menu");
  }, [hydrated, items.length, state.status, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);

    const formData = new FormData(e.currentTarget);
    formData.set("idempotencyKey", loadIdempotencyKey());

    try {
      const result = await submitCheckout(JSON.stringify(toCheckoutLines(items)), state, formData);
      setState(result);
      if (result.status === "success") {
        clearIdempotencyKey();
        formRef.current?.reset();
        clearCart();
        try {
          sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(result));
        } catch {
          // Confirmation persistence is best-effort only.
        }
      }
    } catch {
      // A thrown action (network failure, a POS or payment call that fails
      // once those exist) must never leave the button on "Placing Order...".
      setState({ status: "error", code: "unknown", message: "Something went wrong. Please try again." });
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  const lineError = state.status === "error" && state.lineId ? state : null;
  const needsReload = lineError !== null && RELOAD_CODES.has(lineError.code ?? "");
  // Lines the server would refuse with `base`: marked before any submit, and
  // the form waits until the cart is fixed.
  const missingBase = new Set(linesMissingBase(items).map((item) => item.lineId));
  const messageRef = useRef<HTMLParagraphElement>(null);

  // A form-level error is announced (role="alert") and focus goes to the
  // field that caused it, or to the message when no field is the cause.
  useEffect(() => {
    if (state.status !== "error" || state.lineId) return;
    const form = formRef.current;
    if (state.code === "form" && form) {
      const empty = Array.from(form.querySelectorAll<HTMLInputElement>("input[name]")).find((el) => el.value.trim() === "");
      if (empty) {
        empty.focus();
        return;
      }
    }
    messageRef.current?.focus();
  }, [state]);

  // A line-specific error is about the cart as it was submitted. Once the cart
  // changes (the customer edited or removed the line) the marker is stale.
  useEffect(() => {
    setState((current) => (current.status === "error" && current.lineId ? { status: "idle", message: "" } : current));
  }, [items]);

  if (!CHECKOUT_ENABLED || !hydrated) {
    return null;
  }

  if (items.length === 0 && state.status !== "success") {
    return null;
  }

  return (
    <main className="px-section-x pt-36 pb-24">
      <h1
        className="font-headline text-midnight leading-[0.9] uppercase"
        style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
      >
        Checkout
      </h1>

      <p className="font-body-mixed text-sm text-juniper leading-relaxed mt-3 max-w-md">
        {PICKUP_ONLY_NOTE}
      </p>

      {state.status === "success" ? (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center">
          <span className="font-body-caps text-grapefruit-text text-label tracking-micro">
            Order Received
          </span>
          {state.orderRef && (
            <p className="font-headline text-midnight text-lg uppercase">{state.orderRef}</p>
          )}
          <p className="font-body-mixed text-sm text-juniper">{state.message}</p>
          <Link
            href="/menu"
            className="mt-4 font-body-caps text-label tracking-headline text-cream bg-midnight px-8 py-3 hover:opacity-85 transition-opacity duration-300"
          >
            Back to Menu
          </Link>
        </div>
      ) : (
        <div
          className="mt-10 flex flex-col md:flex-row"
          style={{ gap: "clamp(2rem, 4vw, 4.5rem)" }}
        >
          {/* Order summary */}
          <div className="md:w-2/5 shrink-0">
            <h2 className="font-body-caps text-note tracking-headline text-midnight mb-4">
              Order Summary
            </h2>
            <ul className="space-y-3">
              {items.map((item) => (
                <CartLineItem
                  key={item.lineId}
                  item={item}
                  showActions={false}
                  error={
                    lineError?.lineId === item.lineId
                      ? lineError.message
                      : missingBase.has(item.lineId)
                        ? LINE_MESSAGES.base
                        : undefined
                  }
                />
              ))}
            </ul>
            <div className="flex justify-between pt-4">
              <span className="font-body-caps text-note text-midnight">Subtotal</span>
              <span className="font-body-caps text-note text-midnight">
                ${subtotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Customer info form */}
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 max-w-md flex-1"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-name" className="font-body-caps text-juniper text-meta tracking-micro">
                Name
              </label>
              <input
                id="checkout-name"
                name="name"
                maxLength={100}
                type="text"
                required
                autoComplete="name"
                className="bg-transparent border-b border-midnight/rule-strong text-midnight font-body-mixed text-sm py-1.5 placeholder:text-midnight/25 outline-none focus:border-grapefruit transition-colors duration-200"
                placeholder="Your name"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-email" className="font-body-caps text-juniper text-meta tracking-micro">
                Email
              </label>
              <input
                id="checkout-email"
                name="email"
                maxLength={254}
                type="email"
                required
                autoComplete="email"
                className="bg-transparent border-b border-midnight/rule-strong text-midnight font-body-mixed text-sm py-1.5 placeholder:text-midnight/25 outline-none focus:border-grapefruit transition-colors duration-200"
                placeholder="you@email.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-phone" className="font-body-caps text-juniper text-meta tracking-micro">
                Phone
              </label>
              <input
                id="checkout-phone"
                name="phone"
                maxLength={30}
                type="tel"
                required
                autoComplete="tel"
                className="bg-transparent border-b border-midnight/rule-strong text-midnight font-body-mixed text-sm py-1.5 placeholder:text-midnight/25 outline-none focus:border-grapefruit transition-colors duration-200"
                placeholder="(604) 123-4567"
              />
            </div>

            {missingBase.size > 0 && state.status !== "error" && (
              <div className="flex flex-col items-start gap-2">
                <p data-checkout-hint className="font-body-mixed text-grapefruit-text text-note">{MISSING_BASE_HINT}</p>
                <button
                  type="button"
                  onClick={openCart}
                  className="font-body-caps text-label tracking-headline text-midnight px-4 py-2 min-h-11 transition-opacity hover:opacity-70"
                  style={{ border: "0.5px solid var(--rule-strong-midnight)" }}
                >
                  Edit cart
                </button>
              </div>
            )}

            {state.status === "error" && (
              <div className="flex flex-col items-start gap-2">
                <p ref={messageRef} tabIndex={-1} role="alert" className="font-body-mixed text-grapefruit-text text-note outline-none">
                  {needsReload
                    ? "The menu has changed since you opened this page. Reload to see the current menu, then place your order again."
                    : lineError
                      ? "Update the marked item, then place your order again."
                      : state.message}
                </p>
                {lineError && (
                  <button
                    type="button"
                    onClick={needsReload ? () => window.location.reload() : openCart}
                    className="font-body-caps text-label tracking-headline text-midnight px-4 py-2 min-h-11 transition-opacity hover:opacity-70"
                    style={{ border: "0.5px solid var(--rule-strong-midnight)" }}
                  >
                    {needsReload ? "Reload" : "Edit cart"}
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={pending || missingBase.size > 0}
              className="mt-2 self-start font-body-caps text-label tracking-headline text-cream bg-midnight px-8 py-3 min-h-11 hover:opacity-85 transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "Placing Order..." : "Place Order"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
