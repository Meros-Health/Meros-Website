import { beforeEach } from "vitest";

// Every test starts from an empty cart. Action tests run in the node
// environment, where there is no localStorage to clear.
beforeEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
});
