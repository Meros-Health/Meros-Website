"use server";

import { logActionError, logCateringInquiry } from "@/lib/log";
import {
  EMAIL_PATTERN,
  MAX_EMAIL_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  readField,
  tooLong,
} from "@/lib/forms";
import { getCateringRuntime, type CateringRuntime } from "@/lib/catering/runtime";
import type { CateringInquiryRecord } from "@/lib/catering/inquiryStore";

export type CateringInquiryState = {
  status: "idle" | "success" | "error";
  message: string;
  /** Error only: the field to move focus to, so a failure is fixable in one move. */
  field?: string;
};

const MAX_BUSINESS_LENGTH = 120;
const MAX_SHORT_LENGTH = 120; // headcount, needed-on: both are free text, not parsed

// Notification throttle. Above this many inquiries in an hour the row is still
// stored, but it stops earning an email. The honeypot is the only other bot
// defence here, and a bot that gets past it would otherwise flood info@ and
// burn the day's send quota. Set well above any real hour on this form.
const NOTIFY_MAX_PER_HOUR = 20;
const HOUR_MS = 60 * 60 * 1000;

const SUCCESS_MESSAGE =
  "Thanks, we have your inquiry. We will reply at the email you gave us. If it is time sensitive, call (778) 345-3023.";

/** Same fallback the confirmation offers, so a failure is never a dead end. */
const FALLBACK = "email info@merosyogurt.com or call (778) 345-3023";

function error(message: string, field?: string): CateringInquiryState {
  return { status: "error", message, field };
}

export async function submitCateringInquiry(
  _prev: CateringInquiryState,
  formData: FormData
): Promise<CateringInquiryState> {
  try {
    return await processInquiry(formData);
  } catch (err) {
    logActionError("catering inquiry", err);
    return error(`Something went wrong on our end. Please ${FALLBACK}.`);
  }
}

async function processInquiry(formData: FormData): Promise<CateringInquiryState> {
  // Honeypot: a field no person sees and no person fills. Answering a bot with
  // the success copy keeps it from retrying, and nothing is written.
  if (readField(formData, "website")) {
    return { status: "success", message: SUCCESS_MESSAGE };
  }

  const business = readField(formData, "business");
  const contactName = readField(formData, "name");
  const email = readField(formData, "email");
  const phone = readField(formData, "phone") ?? "";
  const headcount = readField(formData, "headcount") ?? "";
  const neededOn = readField(formData, "neededOn") ?? "";
  const message = readField(formData, "message") ?? "";

  if (!business) return error("Tell us the business name.", "business");
  if (!contactName) return error("Tell us your name.", "name");
  if (!email) return error("We need an email address to reply to.", "email");

  const lengthError =
    tooLong("Business name", business, MAX_BUSINESS_LENGTH) ??
    tooLong("Name", contactName, MAX_NAME_LENGTH) ??
    tooLong("Email", email, MAX_EMAIL_LENGTH) ??
    tooLong("Phone", phone, MAX_PHONE_LENGTH) ??
    tooLong("Headcount", headcount, MAX_SHORT_LENGTH) ??
    tooLong("Date", neededOn, MAX_SHORT_LENGTH) ??
    tooLong("Message", message, MAX_MESSAGE_LENGTH);
  if (lengthError) return error(lengthError);

  if (!EMAIL_PATTERN.test(email)) {
    return error("Please enter a valid email address.", "email");
  }

  const runtime = getCateringRuntime();
  if (!runtime.inquiryStore) {
    // No durable destination. Say so plainly: a confirmation here would be a
    // lie, and a business that believes it was received never follows up.
    logCateringInquiry({ stored: false }, { business, contactName, email, phone, message });
    return error(`We could not reach our inbox just now. Please ${FALLBACK} and we will pick it up from there.`);
  }

  const inquiry: CateringInquiryRecord = {
    business,
    contactName,
    email,
    phone,
    headcount,
    neededOn,
    message,
  };

  // The row is the source of truth and the only thing the confirmation speaks
  // for. A throw here reaches the outer catch and the visitor gets the phone
  // number instead of a confirmation.
  await runtime.inquiryStore.record(crypto.randomUUID(), inquiry);

  // The email is a courtesy that tells a human to go look. It runs after the
  // write, cannot change what the visitor is told, and cannot fail the submit.
  await notify(runtime, inquiry);

  logCateringInquiry({ stored: true }, { business, contactName, email, phone, message });
  return { status: "success", message: SUCCESS_MESSAGE };
}

/**
 * Hands the notification to the runtime's defer, which uses waitUntil on the
 * Worker so the confirmation never waits on Resend. Every failure past this
 * point is absorbed: the lead is already stored, so a send that does not land
 * costs a reminder, not the lead.
 */
async function notify(runtime: CateringRuntime, inquiry: CateringInquiryRecord): Promise<void> {
  const { inquiryStore, notifier } = runtime;
  if (!notifier || !inquiryStore) return;

  await runtime.defer(
    (async () => {
      const recent = await inquiryStore.countSince(new Date(Date.now() - HOUR_MS).toISOString());
      if (recent > NOTIFY_MAX_PER_HOUR) {
        // Stored, not sent. Logged as a count so the skip is visible without
        // putting any of the submitted fields in the Worker logs.
        console.warn(`[catering notification] throttled: ${recent} inquiries in the last hour`);
        return;
      }
      await notifier.notify(inquiry);
    })().catch((err) => logActionError("catering notification", err))
  );
}
