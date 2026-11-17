import { readdirSync, statSync } from "fs";
import { join } from "path";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { API_TAGS } from "./app.setup";

// T65 (NFA-10, GOALS.md M30): every controller is documented in Swagger with
// a tag and every route with a summary; a route behind a token guard also
// names its bearer token and its 401 (and, guarded as a whole, 403) answers
const controllerFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return controllerFiles(path);
    return name.endsWith(".controller.ts") ? [path] : [];
  });

// the guards that read a bearer token; LocalAuthGuard and the Google guards
// authenticate otherwise
const TOKEN_GUARDS = ["JwtAuthGuard", "PasswordChangeGuard"];

type Target = object;

// review M30: the guards as Nest reads them, not a regex over the source
const readsToken = (target: Target) =>
  ((Reflect.getMetadata(GUARDS_METADATA, target) ?? []) as { name: string }[])
    .map((guard) => guard.name)
    .some((name) => TOKEN_GUARDS.includes(name));

const responses = (target: Target) =>
  Object.keys(
    (Reflect.getMetadata(DECORATORS.API_RESPONSE, target) ?? {}) as object,
  );

describe("Swagger docs of the controllers", () => {
  const files = controllerFiles(__dirname);

  it("finds the controllers", () => {
    expect(files.length).toBeGreaterThanOrEqual(19);
  });

  it.each(files.map((file) => [file.replace(__dirname, "src")]))(
    "%s documents its tag, routes and token",
    (file) => {
      const path = file.replace(/^src/, __dirname);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const loaded = require(path) as object;
      const exported = Object.values(loaded) as (new () => unknown)[];
      const controller = exported.find((value) =>
        Reflect.hasMetadata("path", value),
      );
      expect(controller).toBeDefined();

      const tags = Reflect.getMetadata(DECORATORS.API_TAGS, controller!) as
        | string[]
        | undefined;
      expect(tags?.length).toBeGreaterThan(0);
      // review M30: declared with a description in the Swagger setup
      expect(Object.keys(API_TAGS)).toEqual(expect.arrayContaining(tags!));

      const guarded = readsToken(controller!);
      if (guarded) {
        expect(
          Reflect.getMetadata(DECORATORS.API_SECURITY, controller!),
        ).toBeDefined();
        expect(responses(controller!)).toEqual(
          expect.arrayContaining(["401", "403"]),
        );
      }

      const proto = controller!.prototype as Record<string, Target>;
      const handlers = Object.getOwnPropertyNames(proto).filter(
        (name) =>
          name !== "constructor" && Reflect.hasMetadata("method", proto[name]),
      );
      // every route handler has a one-line summary (NFA-10: all endpoints
      // documented; review M30: no JSDoc copied into it)
      expect(
        handlers.filter((name) => {
          const operation = Reflect.getMetadata(
            DECORATORS.API_OPERATION,
            proto[name],
          ) as { summary?: string } | undefined;
          return !operation?.summary || operation.summary.includes("\n");
        }),
      ).toEqual([]);
      // a route that reads a token on its own names it, and its 401
      const undocumentedTokens = handlers.filter(
        (name) =>
          !guarded &&
          readsToken(proto[name]) &&
          (!Reflect.getMetadata(DECORATORS.API_SECURITY, proto[name]) ||
            !responses(proto[name]).includes("401")),
      );
      expect(undocumentedTokens).toEqual([]);
    },
  );
});
