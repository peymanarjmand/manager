/** Money input text stays decimal text; grouping never passes through Number. */
export function normalizeMoney(value: string): string | null {
  const raw = value
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[٬,\s]/g, "")
    .replace(/٫/g, ".")
    .replace(/−/g, "-");
  return /^-?\d*(?:\.\d*)?$/.test(raw) ? raw : null;
}
export function groupMoney(value: string | number | undefined | null): string {
  const text =
    typeof value === "number"
      ? Number.isFinite(value)
        ? value.toLocaleString("en-US", {
            useGrouping: false,
            maximumSignificantDigits: 21,
          })
        : ""
      : String(value ?? "");
  const raw = normalizeMoney(text);
  if (raw === null) return "";
  const [whole, fraction] = raw.split(".");
  return (
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    (fraction === undefined ? "" : `.${fraction}`)
  );
}
