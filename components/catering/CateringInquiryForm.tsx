"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRevealReady } from "@/lib/useRevealReady";
import { Reveal } from "@/components/ui/ScrollReveal";
import { submitCateringInquiry, type CateringInquiryState } from "@/app/actions/catering";
import { CATERING_CONTACT } from "@/lib/catering/content";
import { BUSINESS } from "@/lib/business";

// The only conversion on the page. It writes a row to D1 (migrations/0002)
// through the server action, which then emails info@ as a courtesy. The row is
// what the confirmation speaks for, so the email and phone sit next to the form
// rather than behind it, and a failed submit hands both over instead of asking
// the visitor to try again into the same hole.
//
// Every field here is free text. Headcount and date are not parsed: an event
// is described in a sentence more often than it fits a picker, and a form that
// argues with the caller is a lead lost.

const RULE = "rgba(255, 247, 240, 0.20)";
const FIELD_CLASS =
  "bg-transparent border-b text-cream font-body-mixed text-sm py-2 placeholder:text-cream/25 outline-none focus:border-grapefruit transition-colors duration-200";

const IDLE: CateringInquiryState = { status: "idle", message: "" };

export function CateringInquiryForm() {
  const ref = useRef<HTMLElement>(null);
  const show = useRevealReady(ref, "-120px");

  const [state, setState] = useState<CateringInquiryState>(IDLE);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);

  // Move focus to whichever field the server rejected, so a failure is one
  // keystroke from fixable rather than a hunt back up the form.
  useEffect(() => {
    if (state.status !== "error" || !state.field) return;
    const el = formRef.current?.elements.namedItem(state.field);
    if (el instanceof HTMLElement) el.focus();
  }, [state]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // `disabled` only lands on the next render; the ref stops a second submit
    // dispatched in the same tick.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      setState(await submitCateringInquiry(state, formData));
    } catch {
      setState({
        status: "error",
        message: "Something went wrong on our end. Please email info@merosyogurt.com or call (778) 345-3023.",
      });
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  return (
    <section
      id={CATERING_CONTACT.inquiryAnchor}
      ref={ref}
      className="w-full bg-midnight text-cream scroll-mt-24"
    >
      <div className="mx-auto w-full max-w-[1600px] px-section-x py-section">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-20">
          {/* Left: what happens next, plus the two routes that work today. */}
          <div className="flex min-w-0 flex-col lg:w-[36%]">
            <Reveal show={show} index={0}>
              <h2
                className="font-headline uppercase leading-[0.95] text-cream"
                style={{ fontSize: "clamp(2rem, 4.2vw, 3.25rem)" }}
              >
                Start an order
              </h2>
            </Reveal>
            <Reveal show={show} index={1}>
              <p className="font-body-mixed mt-6 max-w-md leading-relaxed text-[0.95rem] text-cream/65">
                Send us the shape of what you need. We read every one of these and reply with a
                written quote.
              </p>
            </Reveal>
            <Reveal show={show} index={2}>
              <div className="mt-10 flex flex-col gap-3">
                <span className="font-body-caps text-cream/40 text-[9px] tracking-[0.30em]">
                  Or reach us directly
                </span>
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="font-body-mixed text-cream/75 text-sm transition-colors duration-200 hover:text-grapefruit"
                >
                  {BUSINESS.email}
                </a>
                <a
                  href={`tel:${BUSINESS.phone.replace(/-/g, "")}`}
                  className="font-body-mixed text-cream/75 text-sm transition-colors duration-200 hover:text-grapefruit"
                >
                  {BUSINESS.phoneDisplay}
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right: the form itself. */}
          <div className="min-w-0 flex-1">
            {state.status === "success" ? (
              <Reveal show={show} index={3}>
                <div role="status" className="flex flex-col gap-3 py-6">
                  <span className="font-body-caps text-grapefruit text-[10px] tracking-[0.25em]">
                    Received
                  </span>
                  <p className="font-body-mixed max-w-lg leading-relaxed text-cream/75 text-sm">
                    {state.message}
                  </p>
                </div>
              </Reveal>
            ) : (
              <Reveal show={show} index={3}>
                <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
                  {/* Honeypot: off screen, never announced, never focusable. */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden
                    className="absolute h-0 w-0 overflow-hidden opacity-0"
                  />

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Field
                      id="catering-business"
                      name="business"
                      label="Business name"
                      placeholder="Company or venue"
                      maxLength={120}
                      autoComplete="organization"
                      required
                    />
                    <Field
                      id="catering-name"
                      name="name"
                      label="Your name"
                      placeholder="Who we reply to"
                      maxLength={100}
                      autoComplete="name"
                      required
                    />
                    <Field
                      id="catering-email"
                      name="email"
                      label="Email"
                      type="email"
                      placeholder="you@company.com"
                      maxLength={254}
                      autoComplete="email"
                      required
                    />
                    <Field
                      id="catering-phone"
                      name="phone"
                      label="Phone"
                      type="tel"
                      placeholder="Optional"
                      maxLength={30}
                      autoComplete="tel"
                    />
                    <Field
                      id="catering-headcount"
                      name="headcount"
                      label="Headcount"
                      placeholder="How many people"
                      maxLength={120}
                    />
                    <Field
                      id="catering-needed-on"
                      name="neededOn"
                      label="Date or cadence"
                      placeholder="March 4, or every Tuesday"
                      maxLength={120}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="catering-message"
                      className="font-body-caps text-cream/40 text-[9px] tracking-[0.25em]"
                    >
                      Anything else
                    </label>
                    <textarea
                      id="catering-message"
                      name="message"
                      rows={4}
                      maxLength={2000}
                      placeholder="Allergies, delivery window, how you plan to serve it"
                      className={`${FIELD_CLASS} resize-none`}
                      style={{ borderColor: RULE }}
                    />
                  </div>

                  {state.status === "error" && (
                    <p role="alert" className="font-body-mixed text-grapefruit text-xs">
                      {state.message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={pending}
                    className="mt-2 self-start bg-cream px-8 py-3.5 font-body-caps text-[10px] tracking-[0.25em] text-midnight transition-colors duration-300 hover:bg-grapefruit disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending ? "Sending..." : "Send inquiry"}
                  </button>

                  <p className="font-body-mixed text-cream/40 text-xs leading-relaxed">
                    We use what you send here to quote and reply, nothing else. Our{" "}
                    <Link
                      href="/privacy"
                      className="underline transition-colors duration-200 hover:text-grapefruit"
                    >
                      Privacy Policy
                    </Link>{" "}
                    covers how it is stored and who handles it.
                  </p>
                </form>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  id,
  name,
  label,
  placeholder,
  maxLength,
  type = "text",
  autoComplete,
  required = false,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  maxLength: number;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="font-body-caps text-cream/40 text-[9px] tracking-[0.25em]">
        {label}
        {required && <span aria-hidden className="text-grapefruit"> *</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        required={required}
        className={FIELD_CLASS}
        style={{ borderColor: RULE }}
      />
    </div>
  );
}
