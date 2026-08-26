export const VALID_CUSTOMER = {
  name: "Test Customer",
  email: "customer@example.com",
  phone: "604-123-4567",
};

export const IDLE = { status: "idle" as const, message: "" };

export function makeFormData(fields: Record<string, string | Blob>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return fd;
}

/** The F4 repro: a File where the action expects a string. */
export function fileField(): Blob {
  return new File(["x"], "x.txt", { type: "text/plain" });
}
