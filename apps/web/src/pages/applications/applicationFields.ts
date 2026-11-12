export const profileFields = ["name", "country", "city", "directorName", "directorPhone"] as const;
export const contactFields = ["representativeName", "representativeEmail"] as const;
export const applicationFields = [...profileFields, ...contactFields];
export type ApplicationValues = Record<(typeof applicationFields)[number], string>;
