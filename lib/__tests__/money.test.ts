import { describe, expect, it } from "vitest";
import { groupMoney, normalizeMoney } from "../money";
describe("money entry", () => {
  it("groups Persian, Arabic and Latin digits without losing precision", () => {
    expect(groupMoney("۲۰۰۰۰۰۰۰")).toBe("20,000,000");
    expect(groupMoney("٩٠٠٧١٩٩٢٥٤٧٤٠٩٩٣")).toBe("9,007,199,254,740,993");
    expect(normalizeMoney("۲۰٬۰۰۰٬۰۰۰")).toBe("20000000");
  });
  it("preserves decimal drafts, negative values and empty input", () => {
    expect(groupMoney("12345.00")).toBe("12,345.00");
    expect(groupMoney("1234.")).toBe("1,234.");
    expect(groupMoney("-2000000")).toBe("-2,000,000");
    expect(groupMoney(0)).toBe("0");
    expect(groupMoney(0.000001)).toBe("0.000001");
    expect(groupMoney("")).toBe("");
  });
  it("does not turn malformed or exponential text into a different amount", () => {
    for (const value of ["1e3", "12x34", "1.2.3", "12-3"])
      expect(normalizeMoney(value)).toBeNull();
  });
});
