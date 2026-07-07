"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { submitCheckout, type CheckoutFormState } from "@/app/actions/checkout";
import { CHECKOUT_ENABLED } from "@/lib/config";

const LAST_ORDER_KEY = "meros-last-order";

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

  const [state, setState] = useState<CheckoutFormState>({ status: "idle", message: "" });
  const [pending, setPending] = useState(false);
  // Wait for the persisted cart to rehydrate before deciding anything —
  // otherwise a fresh page load always sees an empty cart and redirects.
  const [hydrated, setHydrated] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useCartStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!CHECKOUT_ENABLED) {
      router.replace("/order");
      return;
    }
    if (!hydrated || state.status === "success") return;
    if (items.length > 0) return;

    // Empty cart: restore the last confirmation (e.g. the user refreshed the
    // success screen) instead of silently bouncing to the menu.
    const lastOrder = readLastOrder();
    if (lastOrder) {
      setState(lastOrder);
      return;
    }
    router.replace("/order");
  }, [hydrated, items.length, state.status, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const result = await submitCheckout(JSON.stringify(items), state, formData);
    setState(result);
    setPending(false);
    if (result.status === "success") {
      formRef.current?.reset();
      clearCart();
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(result));
      } catch {
        // Confirmation persistence is best-effort only.
      }
    }
  }

  if (!CHECKOUT_ENABLED || !hydrated) {
    return null;
  }

  if (items.length === 0 && state.status !== "success") {
    return null;
  }

  return (
    <main className="px-[7vw] pt-36 pb-24">
      <h1
        className="font-headline text-midnight leading-[0.9] uppercase"
        style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
      >
        Checkout
      </h1>

      {state.status === "success" ? (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center">
          <span className="font-body-caps text-grapefruit text-[10px] tracking-[0.25em]">
            Order Received
          </span>
          {state.orderRef && (
            <p className="font-headline text-midnight text-lg uppercase">{state.orderRef}</p>
          )}
          <p className="font-body-mixed text-sm text-juniper">{state.message}</p>
          <Link
            href="/order"
            className="mt-4 font-body-caps text-[10px] tracking-widest text-cream bg-midnight px-8 py-3 hover:opacity-85 transition-opacity duration-300"
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
            <h2 className="font-body-caps text-[11px] tracking-widest text-midnight mb-4">
              Order Summary
            </h2>
            <ul className="space-y-3">
              {items.map((item) => (
                <CartLineItem key={item.lineId} item={item} showActions={false} />
              ))}
            </ul>
            <div className="flex justify-between pt-4">
              <span className="font-body-caps text-[11px] text-midnight">Subtotal</span>
              <span className="font-body-caps text-[11px] text-midnight">
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
              <label htmlFor="checkout-name" className="font-body-caps text-juniper text-[9px] tracking-[0.25em]">
                Name
              </label>
              <input
                id="checkout-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className="bg-transparent border-b border-midnight/20 text-midnight font-body-mixed text-sm py-1.5 placeholder:text-midnight/25 outline-none focus:border-grapefruit transition-colors duration-200"
                placeholder="Your name"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-email" className="font-body-caps text-juniper text-[9px] tracking-[0.25em]">
                Email
              </label>
              <input
                id="checkout-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="bg-transparent border-b border-midnight/20 text-midnight font-body-mixed text-sm py-1.5 placeholder:text-midnight/25 outline-none focus:border-grapefruit transition-colors duration-200"
                placeholder="you@email.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-phone" className="font-body-caps text-juniper text-[9px] tracking-[0.25em]">
                Phone
              </label>
              <input
                id="checkout-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                className="bg-transparent border-b border-midnight/20 text-midnight font-body-mixed text-sm py-1.5 placeholder:text-midnight/25 outline-none focus:border-grapefruit transition-colors duration-200"
                placeholder="(604) 123-4567"
              />
            </div>

            {state.status === "error" && (
              <p className="font-body-mixed text-grapefruit text-[11px]">{state.message}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 self-start font-body-caps text-[10px] tracking-widest text-cream bg-midnight px-8 py-3 hover:opacity-85 transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "Placing Order..." : "Place Order"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
