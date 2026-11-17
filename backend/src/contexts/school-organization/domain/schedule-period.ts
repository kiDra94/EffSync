/** A schedule's period: if both ends are set, it starts before it ends. */
export function isValidPeriod(
  validFrom: Date | null | undefined,
  validTo: Date | null | undefined,
): boolean {
  return !(validFrom && validTo && validFrom > validTo);
}
