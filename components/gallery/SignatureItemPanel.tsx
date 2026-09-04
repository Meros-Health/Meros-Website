"use client";

import { useCartStore } from "@/store/cartStore";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { useAddedBeat } from "@/lib/useAddedBeat";
import { addSignatureDirect, needsConfiguration, startingPrice } from "@/lib/menu/signatureAdd";
import { shortName, type SignatureItem } from "@/lib/menu/signatures";

// One menu item, drawn as a gallery text panel. Shared by /menu and the home
// page's preview, so an item reads and behaves the same on both: same add
// behaviour, same accessible names, same order of information.
//
// No price. Every bowl costs the same and every smoothie costs the same, so a
// price on each panel prints the same numbers over and over; it is stated once
// under the section heading instead (categoryPriceLine). The exception is an
// item the menu cannot price at all, which no heading can say on its behalf.
//
// Everything is stacked, one thing per line. That is not decoration: the card
// layout this replaced put the name and the price on one flex line with the
// heading allowed to shrink below its own width, so a single unwrappable word
// ("Moment") ran out of its box and straight through "From $12". Stacking
// removes the collision rather than patching it, at every width.

export function SignatureItemPanel({ item }: { item: SignatureItem }) {
  const addItem = useCartStore((s) => s.addItem);
  const openAdd = useCartStore((s) => s.openAdd);
  const { added, flash } = useAddedBeat(item.id);
  // A bowl needs a size and a yogurt, so its button opens the add modal. A
  // smoothie has one size and its default yogurt, so it adds in one press.
  const starting = startingPrice(item);

  const handleAdd = () => {
    if (added) return;
    if (needsConfiguration(item)) {
      openAdd(item.id);
      return;
    }
    if (addSignatureDirect(item, addItem) === "added") flash();
  };

  return (
    <>
      <h3
        className="font-headline leading-[0.92] uppercase"
        style={{ fontSize: "var(--gallery-name-size)", color: "var(--gallery-ink)" }}
      >
        {shortName(item)}
      </h3>

      <p
        className="font-body-caps tracking-headline"
        style={{ fontSize: "var(--gallery-tag-size)", color: "var(--gallery-ink-accent)" }}
      >
        {item.tags.join(" · ")}
      </p>

      {/* Toppings only. The yogurt is chosen in the add modal. */}
      <p
        className="font-body-mixed leading-relaxed"
        style={{ fontSize: "var(--gallery-body-size)", color: "var(--gallery-ink-quiet)" }}
      >
        {item.ingredients}
      </p>

      {/* The one item the store cannot photograph, because its fruit rotates. */}
      {item.seasonNote && (
        <p
          className="font-body-mixed leading-relaxed italic"
          style={{ fontSize: "var(--gallery-body-size)", color: "var(--gallery-ink-quiet)" }}
        >
          Featuring {item.seasonNote}
        </p>
      )}

      {starting === undefined && (
        <p
          className="font-body-caps"
          style={{ fontSize: "var(--gallery-price-size)", color: "var(--gallery-ink-accent)" }}
        >
          Unavailable
        </p>
      )}

      {/* Named, because "Add to Cart" is the visible text on every one of these
          and a page carries several. Same strings the ledger used before it. */}
      <AddToCartButton
        onClick={handleAdd}
        added={added}
        ariaLabel={`Add ${item.name} to cart`}
        addedAriaLabel={`${item.name} added to cart`}
        className="!w-auto self-start"
        style={{ fontSize: "var(--gallery-cta-size)" }}
      />
    </>
  );
}

/** Ready to hand to GalleryWall's `renderText`. */
export const renderSignaturePanel = (item: SignatureItem) => <SignatureItemPanel item={item} />;
