/** The themes a user can choose (T67, T68): light, dark or the device's. */
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

/** Light until the user chooses (the look before M25). */
export const DEFAULT_THEME: Theme = "light";
