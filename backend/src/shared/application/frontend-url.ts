/** The frontend's base URL for redirects and links in e-mails. */
export function frontendUrl(): string {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}
