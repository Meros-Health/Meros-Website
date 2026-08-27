"use server";

import { logActionError, logContact } from "@/lib/log";
import {
  EMAIL_PATTERN,
  MAX_EMAIL_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  readField,
  tooLong,
} from "@/lib/forms";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

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

  const lengthError =
    tooLong("Name", name, MAX_NAME_LENGTH) ??
    tooLong("Email", email, MAX_EMAIL_LENGTH) ??
    tooLong("Message", message, MAX_MESSAGE_LENGTH);
  if (lengthError) return { status: "error", message: lengthError };

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  // TODO(contact): wire an email service here (Cloudflare Email Service fits
  // the deploy target). Until then production has no delivery path for this
  // form: the log below carries no personal data outside development.
  logContact({ messageLength: message.length }, { name, email, message });

  return { status: "success", message: "Thanks! We'll be in touch shortly." };
}
