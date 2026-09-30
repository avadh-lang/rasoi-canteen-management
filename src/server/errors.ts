import { CartError } from "@/lib/domain/pricing";

/** An error whose message is safe and useful to show the person who caused it. */
export class UserFacingError extends Error {}

export function messageFor(error: unknown): string {
  if (error instanceof UserFacingError || error instanceof CartError) return error.message;
  if (error instanceof Error && error.name === "AuthError") return error.message;
  console.error(error);
  return "Something went wrong on our side. Try again in a moment.";
}
