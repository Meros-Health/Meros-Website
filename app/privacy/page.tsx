import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";
import { breadcrumbSchema } from "@/lib/business";
import { JsonLd } from "@/components/seo/JsonLd";
import Link from "next/link";
import { LegalShell, LegalSection, LegalList } from "@/components/legal/LegalPage";

// TODO(stripe): when Stripe is integrated into checkout, update this policy:
//   1. Add Stripe to "Service Providers" (payment processing, card data handled
//      by Stripe: we never see full card numbers; link to stripe.com/privacy).
//   2. Mention that payment info is collected at checkout and processed by Stripe.
//   3. Bump the effective date below.
// Every processor that touches submitted information is named in "Service
// Providers"; the same applies to anything added later (analytics, a marketing
// email tool). tests/unit/catering.test.ts fails if Resend leaves that list.

const EFFECTIVE_DATE = "August 31, 2026";

export const metadata = pageMetadata({
  title: "Privacy Policy - MERŌS",
  description: "How MERŌS collects, uses, and protects your personal information.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(SITE_URL, "Privacy Policy", "/privacy")} />
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
          <a href="mailto:info@merosyogurt.com" className="underline hover:text-grapefruit transition-colors">
            info@merosyogurt.com
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
              <strong className="font-normal text-midnight">When you submit a catering
              inquiry:</strong> your business name, your name, email address, phone number
              if you give one, the headcount and date or cadence you ask about, and
              anything else you write in the message. We use this to prepare a quote and
              respond to you.
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

      <LegalSection heading="Storage on Your Device" id="cookies">
        <p>
          Your cart is saved in your own browser&rsquo;s local storage so it isn&rsquo;t
          lost between visits, and your most recent order confirmation is kept in session
          storage so it survives a page refresh. This information stays on your device
          (it is not transmitted to us until you place an order) and you can
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
              Links to our Instagram profile. Following them takes you to Instagram,
              which is governed by Meta&rsquo;s privacy policy.
            </span>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="Service Providers">
        <p>
          A few companies handle information on our behalf so the website can run. They
          may only use it to provide their service to us, under our instructions, and not
          for their own purposes:
        </p>
        <LegalList
          items={[
            <span key="cloudflare">
              <strong className="font-normal text-midnight">Cloudflare</strong> hosts the
              website and provides the database in which orders and catering inquiries are
              stored. See the{" "}
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
            <span key="resend">
              <strong className="font-normal text-midnight">Resend</strong> delivers the
              email that tells us a catering inquiry has arrived. That email contains what
              you entered on the form, so that we can read and reply to it. See the{" "}
              <a
                href="https://resend.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-grapefruit transition-colors"
              >
                Resend Privacy Policy
              </a>
              .
            </span>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="Consent">
        <p>
          By submitting an order or a catering inquiry, you consent to us collecting and using
          the information you provide for the purposes described above. You may withdraw
          your consent at any time by emailing{" "}
          <a href="mailto:info@merosyogurt.com" className="underline hover:text-grapefruit transition-colors">
            info@merosyogurt.com
          </a>
          , subject to legal or contractual restrictions, for example we may need
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
          We keep order and catering inquiry information only as long as we have a reason
          to: fulfilling your order, quoting and replying to your inquiry, meeting legal
          and accounting requirements, and resolving any dispute. A catering inquiry is a
          business record, so we may keep it for as long as we are dealing with the
          business that sent it. You can ask us to delete your information at any time
          (see &ldquo;Your Rights&rdquo; below) and we will, unless the law requires us to
          keep it.
        </p>
      </LegalSection>

      <LegalSection heading="Where It Is Processed">
        <p>
          Our website is hosted on Cloudflare&rsquo;s global network, so technical data may
          be processed on servers outside of Canada, including in the United States. The
          same is true of the information you submit: orders and catering inquiries are
          stored in a Cloudflare database, and catering inquiries also pass through Resend
          to reach our inbox. Both companies operate outside Canada. When personal
          information is handled outside Canada, it may be subject to the laws of those
          jurisdictions and accessible to their authorities under those laws.
        </p>
      </LegalSection>

      <LegalSection heading="Your Rights">
        <p>
          Under Canadian privacy law, you may ask us to show you the personal information
          we hold about you, correct it if it is inaccurate, or delete it (subject to legal
          retention requirements). To make a request, email{" "}
          <a href="mailto:info@merosyogurt.com" className="underline hover:text-grapefruit transition-colors">
            info@merosyogurt.com
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
          <a href="mailto:info@merosyogurt.com" className="underline hover:text-grapefruit transition-colors">
            info@merosyogurt.com
          </a>{" "}
          and we will delete it.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to This Policy">
        <p>
          If we change how we handle personal information (for example, when we add
          online payment processing), we will update this policy and revise the
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
    </>
  );
}
