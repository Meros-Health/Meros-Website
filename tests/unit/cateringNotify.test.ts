// @vitest-environment node
//
// The catering notification: what it puts in the message, and what it refuses
// to put there. Every field is typed by a stranger, so the escaping and the
// header stripping are the point, not decoration.
import { describe, expect, it, vi } from "vitest";

import { ResendCateringNotifier, buildNotification } from "@/lib/catering/notify";
import type { CateringInquiryRecord } from "@/lib/catering/inquiryStore";

const INQUIRY: CateringInquiryRecord = {
  business: "Hamilton Street Studios",
  contactName: "Sam Reyes",
  email: "sam@studios.example",
  phone: "604-123-4567",
  headcount: "40 people",
  neededOn: "March 4",
  message: "One nut free tray, please.",
};

const inquiry = (overrides: Partial<CateringInquiryRecord> = {}): CateringInquiryRecord => ({
  ...INQUIRY,
  ...overrides,
});

describe("buildNotification", () => {
  it("carries the whole inquiry, so nobody has to query D1 to see who asked", () => {
    const { subject, text } = buildNotification(inquiry());
    expect(subject).toBe("Catering inquiry: Hamilton Street Studios");
    for (const value of Object.values(INQUIRY)) expect(text).toContain(value);
  });

  it("replies to the business that asked, not to ourselves", () => {
    expect(buildNotification(inquiry()).replyTo).toBe("sam@studios.example");
  });

  it("omits the optional fields that were left blank", () => {
    const { text } = buildNotification(inquiry({ phone: "", headcount: "", neededOn: "", message: "" }));
    expect(text).not.toContain("Phone");
    expect(text).not.toContain("Headcount");
    expect(text).toContain("Business");
  });

  it.each([
    ["subject", "business"],
    ["replyTo", "email"],
  ] as const)("strips newlines out of the %s header", (header, field) => {
    const built = buildNotification(inquiry({ [field]: "a\r\nBcc: victim@example.com" }));
    expect(built[header]).not.toMatch(/[\r\n]/);
    expect(built[header]).toContain("Bcc: victim@example.com");
  });

  it("escapes markup in the html body rather than rendering it", () => {
    const { html } = buildNotification(inquiry({ message: '<img src=x onerror="alert(1)"> & "quoted"' }));
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });

  it("keeps the plain text body unescaped, since it is not markup", () => {
    expect(buildNotification(inquiry({ message: "5 & 6" })).text).toContain("5 & 6");
  });
});

describe("ResendCateringNotifier", () => {
  const config = {
    apiKey: "re_test_key",
    from: "catering@send.merosyogurt.com",
    to: "info@merosyogurt.com",
  };

  const okFetch = () => vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

  it("posts the message to Resend with the key in the auth header", async () => {
    const fetchImpl = okFetch();
    await new ResendCateringNotifier({ ...config, fetchImpl }).notify(inquiry());

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");

    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      from: config.from,
      to: [config.to],
      reply_to: "sam@studios.example",
      subject: "Catering inquiry: Hamilton Street Studios",
    });
    expect(body.text).toContain("One nut free tray, please.");
  });

  it("throws on a rejected send, with the status and nothing else", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: "info@merosyogurt.com" }), { status: 422 }));

    const send = new ResendCateringNotifier({ ...config, fetchImpl }).notify(inquiry());

    await expect(send).rejects.toThrow("HTTP 422");
    // The response body can echo the address we sent to, and this message
    // reaches the logs, which never carry personal data.
    await expect(send).rejects.not.toThrow("info@merosyogurt.com");
  });
});
