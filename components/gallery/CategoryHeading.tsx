import { categoryPriceLine } from "@/lib/menu/pricing";
import type { SignatureCategory } from "@/lib/menu/signatures";

// A category's name and its price, above its wall.
//
// The price is here rather than on each panel because the whole category shares
// one: ten panels each printing "$12" says the same number ten times.
// categoryPriceLine returns undefined the moment the items stop agreeing, which
// is the signal to put per-item prices back; a unit test fails on that too, so
// it cannot reach the page unnoticed.

export function CategoryHeading({ title, category }: { title: string; category: SignatureCategory }) {
  const price = categoryPriceLine(category);
  return (
    <div className="px-section-x pt-24 pb-16 text-center">
      <h2
        className="font-headline text-midnight leading-[0.9] uppercase"
        style={{ fontSize: "clamp(2rem, 4.5vw, 4.25rem)" }}
      >
        {title}
      </h2>
      {price && (
        <p className="font-body-caps text-juniper tracking-headline mt-5 text-caption">{price}</p>
      )}
    </div>
  );
}
