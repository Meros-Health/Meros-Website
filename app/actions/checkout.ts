"use server";

export type CheckoutFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type CheckoutCartLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export async function submitCheckout(
  cartItemsJson: string,
  _prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();

  if (!name || !email || !phone) {
    return { status: "error", message: "All fields are required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  let items: CheckoutCartLine[];
  try {
    items = JSON.parse(cartItemsJson);
  } catch {
    return { status: "error", message: "Something went wrong with your cart. Please try again." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { status: "error", message: "Your cart is empty." };
  }

  // TODO(payment): integrate a payment processor here (e.g. Stripe PaymentIntent)
  // before marking the order placed. For now, log and return success so the
  // client-side flow (redirect + clearCart) is complete end-to-end.
  console.log("[checkout]", { name, email, phone, items });

  return { status: "success", message: "Order received! We'll have it ready shortly." };
}
