"use client";

import { useEffect } from "react";
import { subscribeCartSync } from "@/store/cartSync";

/** Keeps this tab's cart in step with writes from other tabs. Renders nothing. */
export function CartSync() {
  useEffect(() => subscribeCartSync(), []);
  return null;
}
