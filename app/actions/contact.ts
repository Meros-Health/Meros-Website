"use server";

import { logActionError, logContact } from "@/lib/log";

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

/** FormData values are strings or Files; anything but a string is treated as missing. */
function readField(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : null;
}

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  try {
    return await processContact(formData);
  } catch (err) {
    logActionError("contact form", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}

async function processContact(formData: FormData): Promise<ContactFormState> {
  const name = readField(formData, "name");
  const email = readField(formData, "email");
  const message = readField(formData, "message");

  if (!name || !email || !message) {
    return { status: "error", message: "All fields are required." };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return { status: "error", message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return { status: "error", message: `Email must be ${MAX_EMAIL_LENGTH} characters or fewer.` };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { status: "error", message: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  // TODO(contact): wire an email service here (Cloudflare Email Service fits
  // the deploy target). Until then production has no delivery path for this
  // form: the log below carries no personal data outside development.
  logContact({ messageLength: message.length }, { name, email, message });

  return { status: "success", message: "Thanks! We'll be in touch shortly." };
}
