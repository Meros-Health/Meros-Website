import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";
import { breadcrumbSchema } from "@/lib/business";
import { JsonLd } from "@/components/seo/JsonLd";
import { SectionBand } from "@/components/ui/SectionBand";
import { CateringHero } from "@/components/catering/CateringHero";
import { CateringSection } from "@/components/catering/CateringSection";
import { HowItWorks } from "@/components/catering/HowItWorks";
import { CateringInquiryForm } from "@/components/catering/CateringInquiryForm";
import {
  CATERING_AUDIENCE,
  CATERING_CONTACT,
  CATERING_FORMATS,
  CATERING_NOTES,
  CATERING_YOGURTS,
  cateringServiceSchema,
} from "@/lib/catering/content";

// The destination for the catering business card. /cater (a redirect in
// next.config.ts) lands here, as does the nav's "Catering" entry.
//
// Content lives in lib/catering/content.ts, not in this file.

export const metadata = pageMetadata({
  title: "Catering - MERŌS",
  description:
    "Yogurt catering for offices, meetings and events in Vancouver. Bowls, a yogurt bar, smoothies in bulk, or staffed service. Delivered, invoiced and receipted.",
  path: "/catering",
});

export default function CateringPage() {
  return (
    <main className="overflow-x-clip">
      <JsonLd data={breadcrumbSchema(SITE_URL, "Catering", "/catering")} />
      <JsonLd data={cateringServiceSchema(SITE_URL)} />

      <CateringHero />

      <SectionBand>{"CATERING, FROM YALETOWN"}</SectionBand>

      <CateringSection
        id={CATERING_CONTACT.servesAnchor}
        tone="cream"
        eyebrow="What we serve"
        title="Feeding a room"
        intro="Four ways we serve a group. They combine in one order if that suits the room better than any single format does."
        items={CATERING_FORMATS}
        audienceLabel="Who this is for"
        audience={CATERING_AUDIENCE}
      />

      <CateringSection
        id={CATERING_CONTACT.yogurtsAnchor}
        tone="midnight"
        eyebrow="The yogurts"
        title="Pick your base"
        intro="The same four yogurts the store pours, in volume. Choose one for the room or put out more than one."
        items={CATERING_YOGURTS}
        notes={CATERING_NOTES}
      />

      <HowItWorks />

      <CateringInquiryForm />
    </main>
  );
}
