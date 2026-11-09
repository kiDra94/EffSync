import type { NextFunction, Request, Response } from "express";

/**
 * HTTPS only (T62, NFA-05, 06_…:213, decision Q4): behind the reverse proxy
 * that terminates TLS, a request that came in over plain HTTP is redirected
 * to HTTPS with 308, which keeps the method and body. Needs `trust proxy`,
 * so `req.secure` reads the proxy's X-Forwarded-Proto.
 *
 * The target is the configured public address (PUBLIC_URL), never the Host
 * header: that one comes from the client (review M30).
 */
export function httpsOnly(publicUrl: string) {
  const origin = new URL(publicUrl).origin;
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.secure) {
      next();
      return;
    }
    res.redirect(308, `${origin}${req.originalUrl}`);
  };
}
