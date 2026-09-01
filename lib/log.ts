// Server-side logging for the actions. Production entries never carry
// personal data (name, email, phone, message): Workers log retention would
// otherwise become personal-data storage under the privacy policy. In
// development the full payload is logged so the forms have a visible
// destination locally.

const isProduction = process.env.NODE_ENV === "production";

type OrderSummary = {
  orderRef: string;
  idempotencyKey: string;
  lineCount: number;
  total: number;
};

type OrderDetail = {
  name: string;
  email: string;
  phone: string;
  items: unknown[];
};

export function logOrder(summary: OrderSummary, detail: OrderDetail): void {
  console.log("[checkout]", isProduction ? summary : { ...summary, ...detail });
}

type CateringInquirySummary = { stored: boolean };
type CateringInquiryDetail = { business: string; contactName: string; email: string; phone: string; message: string };

/** The inquiry row itself carries the contact details (migrations/0002); the log never does. */
export function logCateringInquiry(summary: CateringInquirySummary, detail: CateringInquiryDetail): void {
  console.log("[catering inquiry]", isProduction ? summary : { ...summary, ...detail });
}

/** Error class and message only. Never the request payload. */
export function logActionError(action: string, err: unknown): void {
  const description = err instanceof Error ? `${err.name}: ${err.message}` : typeof err;
  console.error(`[${action}] failed:`, description);
}

/**
 * Development-only warning for failures the app deliberately absorbs (storage
 * writes, an unreadable persisted line). Silent in production; visible while
 * developing so an absorbed failure is never a mystery.
 */
export function warnDev(message: string, err?: unknown): void {
  if (isProduction) return;
  if (err === undefined) console.warn(message);
  else console.warn(message, err);
}

