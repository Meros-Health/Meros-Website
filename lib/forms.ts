// Shared by the checkout and contact server actions.

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_PHONE_LENGTH = 30;
export const MAX_MESSAGE_LENGTH = 2000;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** FormData values are strings or Files; anything but a string is treated as missing. */
export function readField(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : null;
}

/** Null when within the cap, otherwise the message to show. */
export function tooLong(label: string, value: string, max: number): string | null {
  return value.length > max ? `${label} must be ${max} characters or fewer.` : null;
}
