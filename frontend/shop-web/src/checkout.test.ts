import { CONFIRMATION_STORAGE_KEY, type CheckoutResponse } from "@pocochic/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { checkoutIssues, isBlockingIssue, joinName, phoneDigits, readReceipt, saveReceipt, summaryMeta } from "./checkout";

const fields = {
  firstName: "Amira",
  lastName: "Ben Salem",
  phone: "22 123 456",
  governorateId: "gov1",
  delegationId: "del1",
  address: "Rue de la liberté",
  social: "asma.ben.salem",
};

const receipt: CheckoutResponse = {
  id: "ord1",
  orderNumber: "POC-0001",
  status: "pending",
  itemsCents: 4500,
  deliveryCents: 800,
  discountCents: 500,
  totalCents: 4800,
  promoCode: "FIVE",
  lines: [],
  thankYou: { locale: "fr", body: "Merci", imagePath: null },
};

describe("checkout fields", () => {
  it("joins both names and keeps an 8-digit phone", () => {
    expect(joinName("  Amira ", " Ben   Salem ")).toBe("Amira Ben Salem");
    expect(phoneDigits("22 123 456")).toBe("22123456");
    expect(checkoutIssues(fields)).toEqual([]);
  });

  it("blocks an address past 80 characters and a short phone", () => {
    const issues = checkoutIssues({ ...fields, phone: "123", address: "a".repeat(81), social: "" });
    expect(issues).toContain("phone");
    expect(issues).toContain("addressLong");
    expect(isBlockingIssue("addressLong")).toBe(true);
    expect(isBlockingIssue("phone")).toBe(false);
  });

  it("formats a summary line from the size, the reference, and the quantity", () => {
    expect(summaryMeta({ reference: "CREAM", size: "M" }, "QTY", 1)).toBe("CREAM · M · QTY 1");
    expect(summaryMeta({ reference: "", size: "S" }, "Qté", 2)).toBe("S · Qté 2");
  });
});

describe("confirmation receipt", () => {
  beforeEach(() => sessionStorage.clear());

  it("survives a refresh in this tab and ignores a broken payload", () => {
    saveReceipt(receipt);
    expect(readReceipt()?.orderNumber).toBe("POC-0001");
    sessionStorage.setItem(CONFIRMATION_STORAGE_KEY, "{");
    expect(readReceipt()).toBeNull();
  });
});
