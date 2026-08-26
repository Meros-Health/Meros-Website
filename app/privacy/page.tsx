import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection, LegalList } from "@/components/legal/LegalPage";

// TODO(stripe): when Stripe is integrated into checkout, update this policy:
//   1. Add Stripe to "Service Providers" (payment processing, card data handled
//      by Stripe — we never see full card numbers; link to stripe.com/privacy).
//   2. Mention that payment info is collected at checkout and processed by Stripe.
//   3. Bump the effective date below.
// Same applies if we ever add analytics (e.g. Cloudflare Web Analytics, GA) or
// an email service (e.g. Resend) — each new processor gets listed here.

const EFFECTIVE_DATE = "July 7, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy — MERŌS",
  description: "How MERŌS collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection heading="Who We Are">
        <p>
          MERŌS (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates a yogurt bar
          located at 1207 Hamilton Street, Yaletown, Vancouver, British Columbia, and this
          website. This policy explains what personal information we collect through the
          website, why we collect it, and how we handle it. We comply with the Personal
          Information Protection and Electronic Documents Act (PIPEDA) and British
          Columbia&rsquo;s Personal Information Protection Act (PIPA).
        </p>
        <p>
          Questions about this policy or your personal information can be sent to{" "}
          <a href="mailto:hello@meros.ca" className="underline hover:text-grapefruit transition-colors">
            hello@meros.ca
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What We Collect">
        <p>We collect personal information only when you choose to provide it:</p>
        <LegalList
          items={[
            <span key="order">
              <strong className="font-normal text-midnight">When you place an order:</strong>{" "}
              your name, email address, phone number, and the contents of your order. We use
              this to prepare your order, contact you about it, and confirm pickup.
            </span>,
            <span key="contact">
              <strong className="font-normal text-midnight">When you contact us:</strong> your
              name, email address, and the message you send. We use this to respond to your
              inquiry.
            </span>,
          ]}
        />
        <p>
          We do not sell personal information, use it for advertising, or share it with
          third parties for their own purposes.
        </p>
      </LegalSection>

      <LegalSection heading="Information Collected Automatically">
        <p>
          Like nearly all websites, some technical information is collected automatically
          when you visit:
        </p>
        <LegalList
          items={[
            <span key="cf">
              Our website is served through Cloudflare, our hosting and content delivery
              provider. Cloudflare processes visitors&rsquo; IP addresses and request data
              (such as browser type and pages requested) to deliver the site and protect it
              from malicious traffic. Cloudflare may set strictly necessary cookies (for
              example, for bot protection) as part of providing this service. See the{" "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-grapefruit transition-colors"
              >
                Cloudflare Privacy Policy
              </a>
              .
            </span>,
            <span key="logs">
              Standard server logs (IP address, timestamps, and requested pages) may be
              retained briefly for security and troubleshooting.
            </span>,
          ]}
        />
        <p>
          We do not currently use analytics tools, advertising trackers, or marketing
          cookies on this website.
        </p>
      </LegalSection>

      <LegalSection heading="Storage on Your Device">
        <p>
          Your cart is saved in your own browser&rsquo;s local storage so it isn&rsquo;t
          lost between visits, and your most recent order confirmation is kept in session
          storage so it survives a page refresh. This information stays on your device
          &mdash; it is not transmitted to us until you place an order &mdash; and you can
          clear it at any time through your browser settings.
        </p>
      </LegalSection>

      <LegalSection heading="Third-Party Content">
        <p>
          Some pages embed content from other companies, which may collect data according
          to their own privacy policies when it loads:
        </p>
        <LegalList
          items={[
            <span key="maps">
              An embedded Google Map showing our location (see the{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-grapefruit transition-colors"
              >
                Google Privacy Policy
              </a>
              ).
            </span>,
            <span key="ig">
              Links to our Instagram profile &mdash; following them takes you to Instagram,
              which is governed by Meta&rsquo;s privacy policy.
            </span>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="Consent">
        <p>
          By submitting an order or contact form, you consent to us collecting and using
          the information you provide for the purposes described above. You may withdraw
          your consent at any time by emailing{" "}
          <a href="mailto:hello@meros.ca" className="underline hover:text-grapefruit transition-colors">
            hello@meros.ca
          </a>
          , subject to legal or contractual restrictions &mdash; for example, we may need
          to retain records of a completed order for accounting purposes. Withdrawing
          consent may mean we cannot fulfill an order in progress.
        </p>
      </LegalSection>

      <LegalSection heading="How We Protect It">
        <p>
          Information you submit is sent over an encrypted connection (HTTPS), and access
          to it is limited to the people who need it to prepare your order or respond to
          your message. No method of transmission or storage is completely secure, but we
          take reasonable steps appropriate to the sensitivity of the information, and we
          collect as little as possible in the first place. If a privacy breach ever
          creates a real risk of significant harm, we will notify affected individuals and
          the appropriate privacy authorities as required by law.
        </p>
      </LegalSection>

      <LegalSection heading="How Long We Keep It">
        <p>
          We keep order and contact information only as long as needed to fulfill your
          order or respond to your inquiry, meet legal and accounting requirements, and
          resolve any disputes. After that, it is deleted.
        </p>
      </LegalSection>

      <LegalSection heading="Where It Is Processed">
        <p>
          Our website is hosted on Cloudflare&rsquo;s global network, so technical data may
          be processed on servers outside of Canada, including in the United States. When
          personal information is handled outside Canada, it may be subject to the laws of
          those jurisdictions.
        </p>
      </LegalSection>

      <LegalSection heading="Your Rights">
        <p>
          Under Canadian privacy law, you may ask us to show you the personal information
          we hold about you, correct it if it is inaccurate, or delete it (subject to legal
          retention requirements). To make a request, email{" "}
          <a href="mailto:hello@meros.ca" className="underline hover:text-grapefruit transition-colors">
            hello@meros.ca
          </a>
          . We will respond within the timelines required by law. If you are not satisfied
          with our response, you may contact the Office of the Information and Privacy
          Commissioner for British Columbia or the Privacy Commissioner of Canada.
        </p>
      </LegalSection>

      <LegalSection heading="Children's Privacy">
        <p>
          The website is not directed at children, and we do not knowingly collect
          personal information from anyone under 13. If you believe a child has submitted
          personal information through the website, contact us at{" "}
          <a href="mailto:hello@meros.ca" className="underline hover:text-grapefruit transition-colors">
            hello@meros.ca
          </a>{" "}
          and we will delete it.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to This Policy">
        <p>
          If we change how we handle personal information &mdash; for example, when we add
          online payment processing &mdash; we will update this policy and revise the
          effective date at the top of this page.
        </p>
        <p>
          See also our{" "}
          <Link href="/terms" className="underline hover:text-grapefruit transition-colors">
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
