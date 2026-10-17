/** Web Animations uses milliseconds; CSS optimizers may serialize tokens in seconds. */
export function cssTimeToMilliseconds(value: string): number {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value.trim());
  if (!match) return 0;
  return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
}
