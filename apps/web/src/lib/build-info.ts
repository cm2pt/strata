/**
 * Build identification — injected at build time via NEXT_PUBLIC_BUILD_ID.
 *
 * The value is set automatically by `generateBuildId` in next.config.ts
 * (git SHA or timestamp fallback). It can also be overridden by setting the
 * NEXT_PUBLIC_BUILD_ID environment variable before building.
 */
export const BUILD_ID: string =
  process.env.NEXT_PUBLIC_BUILD_ID ?? "development";
