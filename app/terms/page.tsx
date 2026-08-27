import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection, LegalList } from "@/components/legal/LegalPage";

// TODO(stripe): when Stripe is integrated into checkout, update these terms:
//   1. Update "Orders & Payment" — payment is charged at checkout via Stripe,
//      and describe the refund mechanism (refund to original payment method).
//   2. Bump the effective date below.

const EFFECTIVE_DATE = "July 7, 2026";

export const metadata: Metadata = {
  title: "Terms of Service — MERŌS",
  description: "The terms that govern your use of the MERŌS website and ordering.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection heading="Agreement">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the MERŌS website
          and any orders you place through it. MERŌS (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
          &ldquo;our&rdquo;) operates from 1207 Hamilton Street, Yaletown, Vancouver,
          British Columbia. By using this website or placing an order, you agree to these
          Terms. If you do not agree, please do not use the website.
        </p>
      </LegalSection>

      <LegalSection heading="Eligibility">
        <p>
          This website is intended for general audiences. If you are under 13, please use
          the website with a parent or guardian. We do not knowingly target or market this
          website to children.
        </p>
      </LegalSection>

      <LegalSection heading="Orders & Payment">
        <p>
          Submitting an order through the website is an offer to purchase. An order is not
          confirmed until we accept it, and we may decline or cancel an order at our
          discretion &mdash; for example, if an item is unavailable or the order appears
          fraudulent. If we cancel an order you have already paid for, we will refund it in
          full.
        </p>
        <p>
          All prices are in Canadian dollars and may change at any time without notice.
          Applicable taxes are added where required. We make every effort to keep menu
          items, descriptions, and prices accurate, but errors can occur &mdash; if we
          discover a pricing error affecting your order, we will contact you before
          proceeding.
        </p>
        <p>
          Orders are for pickup at our Yaletown location unless we tell you otherwise.
          Please arrive within a reasonable time of your order being ready; we cannot
          guarantee the quality of items held beyond that.
        </p>
      </LegalSection>

      <LegalSection heading="Refunds">
        <p>
          Because our products are fresh and perishable, all sales are final once an order
          has been prepared. If something is wrong with your order &mdash; a missing item,
          an incorrect item, or a quality issue &mdash; contact us at{" "}
          <a href="mailto:info@merosyogurt.com" className="underline hover:text-grapefruit transition-colors">
            info@merosyogurt.com
          </a>{" "}
          or speak to us in store, and we will make it right with a replacement or refund.
        </p>
      </LegalSection>

      <LegalSection heading="Allergens & Nutrition">
        <p>
          Our menu includes common allergens such as nuts, seeds, dairy, and products that
          may contain gluten. All items are prepared in a shared kitchen, so
          cross-contamination is possible even for items that do not list an allergen as an
          ingredient.
        </p>
        <p>
          Nutrition information shown on the website (including macro estimates in the bowl
          builder) is approximate, based on standard serving sizes, and provided for
          general guidance only. It is not medical or dietary advice. If you have a food
          allergy, intolerance, or medical dietary requirement, please speak with our staff
          before ordering &mdash; do not rely solely on the website.
        </p>
      </LegalSection>

      <LegalSection heading="Using the Website">
        <p>You agree not to:</p>
        <LegalList
          items={[
            "Submit false, misleading, or fraudulent orders or contact requests.",
            "Interfere with the operation or security of the website.",
            "Use automated tools to scrape, overload, or abuse the website.",
            "Use the website for any unlawful purpose.",
          ]}
        />
        <p>We may suspend access to the website for anyone who violates these Terms.</p>
      </LegalSection>

      <LegalSection heading="Our Content">
        <p>
          Everything on this website &mdash; the MERŌS name and logo, text, photography,
          design, and code &mdash; belongs to us or our licensors. You may not copy,
          reproduce, or use it commercially without our written permission.
        </p>
      </LegalSection>

      <LegalSection heading="Disclaimers & Limitation of Liability">
        <p>
          The website is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We do
          not guarantee that it will always be available, error-free, or uninterrupted.
        </p>
        <p>
          To the maximum extent permitted by law, MERŌS will not be liable for indirect,
          incidental, or consequential damages arising from your use of the website, and
          our total liability for any claim related to an order is limited to the amount
          you paid for that order. Nothing in these Terms limits rights that cannot be
          excluded under applicable law, including the British Columbia Business Practices
          and Consumer Protection Act.
        </p>
      </LegalSection>

      <LegalSection heading="Indemnification">
        <p>
          You agree to indemnify and hold MERŌS, its owners, and its staff harmless from
          any claims, damages, or expenses (including reasonable legal fees) arising from
          your violation of these Terms or your misuse of the website. This does not apply
          to claims arising from our own negligence.
        </p>
      </LegalSection>

      <LegalSection heading="Events Beyond Our Control">
        <p>
          We are not responsible for delays or failures in preparing or fulfilling orders
          caused by events beyond our reasonable control &mdash; including supplier
          shortages, power or internet outages, extreme weather, labour disruptions, or
          government orders. If such an event prevents us from fulfilling a paid order, we
          will refund it.
        </p>
      </LegalSection>

      <LegalSection heading="Privacy">
        <p>
          Our{" "}
          <Link href="/privacy" className="underline hover:text-grapefruit transition-colors">
            Privacy Policy
          </Link>{" "}
          explains how we handle the personal information you provide when ordering or
          contacting us. It forms part of these Terms.
        </p>
      </LegalSection>

      <LegalSection heading="Governing Law">
        <p>
          These Terms are governed by the laws of British Columbia and the federal laws of
          Canada applicable in it. Any dispute will be resolved in the courts of British
          Columbia, sitting in Vancouver.
        </p>
      </LegalSection>

      <LegalSection heading="General">
        <p>
          If any part of these Terms is found to be invalid or unenforceable, the rest
          remains in full effect. Our failure to enforce any provision is not a waiver of
          our right to enforce it later. You may not assign your rights under these Terms;
          we may assign ours in connection with a sale or reorganization of the business.
          These Terms, together with the Privacy Policy, are the entire agreement between
          you and MERŌS regarding the website.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to These Terms">
        <p>
          We may update these Terms from time to time &mdash; for example, when we add
          online payment. The version posted on this page, with its effective date, is the
          one that applies. Continued use of the website after a change means you accept
          the updated Terms.
        </p>
        <p>
          Questions? Reach us at{" "}
          <a href="mailto:info@merosyogurt.com" className="underline hover:text-grapefruit transition-colors">
            info@merosyogurt.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
