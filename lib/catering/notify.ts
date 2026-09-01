// Notification for a catering inquiry that has already been stored.
//
// Split from inquiryStore.ts on purpose: the D1 write is the source of truth
// and decides what the visitor is told, while this is a courtesy that tells a
// human to go look. Keeping them apart is what lets the action treat a failed
// send as a non-event.
//
// The provider is deliberately behind one interface. Cloudflare's own Email
// Sending is the natural fit for this stack but is gated behind Workers Paid,
// so this ships on Resend; swapping back later is this file and nothing else.

import type { CateringInquiryRecord } from "@/lib/catering/inquiryStore";

export type CateringNotifier = {
  notify(inquiry: CateringInquiryRecord): Promise<void>;
};

/**
 * Header fields are single-line by definition and every value here is typed by
 * a stranger. Newlines are stripped rather than encoded: nothing legitimate in
 * a business name or subject needs one.
 */
function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FIELD_LABELS: Array<[keyof CateringInquiryRecord, string]> = [
  ["business", "Business"],
  ["contactName", "Contact"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["headcount", "Headcount"],
  ["neededOn", "Needed on"],
  ["message", "Message"],
];

export type CateringNotification = {
  subject: string;
  text: string;
  html: string;
  replyTo: string;
};

/**
 * Pure, so the wording and the escaping are testable without a network call.
 *
 * The whole inquiry travels in the body. A notification that only says one
 * arrived would still leave someone running a database query to find out who,
 * which is the problem this is meant to solve.
 */
export function buildNotification(inquiry: CateringInquiryRecord): CateringNotification {
  const rows = FIELD_LABELS.filter(([key]) => inquiry[key]).map(
    ([key, label]) => [label, inquiry[key]] as const
  );

  return {
    subject: headerSafe(`Catering inquiry: ${inquiry.business}`),
    // Reply-To, not From: hitting reply in the inbox answers the business that
    // asked, instead of answering ourselves.
    replyTo: headerSafe(inquiry.email),
    text: rows.map(([label, value]) => `${label}: ${value}`).join("\n\n"),
    html: rows
      .map(
        ([label, value]) =>
          `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value).replace(/\n/g, "<br>")}</p>`
      )
      .join("\n"),
  };
}

export type ResendConfig = {
  apiKey: string;
  /** Must be on a domain verified in Resend, or the send is rejected. */
  from: string;
  to: string;
  fetchImpl?: typeof fetch;
};

export class ResendCateringNotifier implements CateringNotifier {
  constructor(private readonly config: ResendConfig) {}

  async notify(inquiry: CateringInquiryRecord): Promise<void> {
    const { subject, text, html, replyTo } = buildNotification(inquiry);
    const send = this.config.fetchImpl ?? fetch;

    const response = await send("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.from,
        to: [this.config.to],
        reply_to: replyTo,
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      // Status only. The response body can echo the address we sent to, and
      // this message reaches the logs, which never carry personal data.
      throw new Error(`Resend rejected the notification: HTTP ${response.status}`);
    }
  }
}
