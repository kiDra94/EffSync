import type { NextFunction, Request, Response } from "express";
import { httpsOnly } from "./https-only";

// T62 (M30): plain HTTP goes to HTTPS with 308, HTTPS passes
describe("httpsOnly", () => {
  const redirect = httpsOnly("https://api.effsync.example");
  const response = () =>
    ({ redirect: jest.fn() }) as unknown as Response & {
      redirect: jest.Mock;
    };

  it("lets a secure request through", () => {
    const next = jest.fn() as NextFunction;
    const res = response();

    redirect({ secure: true } as Request, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  // review M30: the Host header is the client's, so it doesn't pick the target
  it("redirects a plain request to the same path on the public address", () => {
    const res = response();

    redirect(
      {
        secure: false,
        headers: { host: "evil.example" },
        originalUrl: "/api/tasks?page=2",
      } as unknown as Request,
      res,
      jest.fn(),
    );

    expect(res.redirect).toHaveBeenCalledWith(
      308,
      "https://api.effsync.example/api/tasks?page=2",
    );
  });

  it("keeps only the origin of the public address", () => {
    const res = response();

    httpsOnly("https://api.effsync.example/")(
      { secure: false, originalUrl: "/api" } as unknown as Request,
      res,
      jest.fn(),
    );

    expect(res.redirect).toHaveBeenCalledWith(
      308,
      "https://api.effsync.example/api",
    );
  });
});
