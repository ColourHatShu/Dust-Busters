// Service areas we currently operate in. Add more as we expand.
export const AREAS = ["Courtenay", "Comox", "Cumberland"] as const;
export type Area = (typeof AREAS)[number];
