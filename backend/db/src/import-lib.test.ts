import { describe, expect, it } from "vitest";
import { applyMigrations, openSqlite } from "./sqlite-port.js";
import { applyImport, slugify, splitThankYou, tndToCents } from "./import-lib.js";

const inventory = `Item,Image,Sizes,Reference,Description,Quantity,Pending Quantity,Sold Quantity,Price,Available,Available Qty
Tee,Inventory_Images/Tee.jpg,S,,,2,1,0,45,YES,9
Tee,Inventory_Images/Tee.jpg,M,,,1,0,1,45.5,NO,0
`;
const discounts = `Discount_ID,Amount,Used?,Type,Min_count,Available Number,Used Number
TEN,10,FALSE,percent,2,3,0
GIFT,5,TRUE,free,1,2,0
`;
const governorates = `name
Tunis
`;
const delegations = `name,governorate
Bab Bhar,Tunis
`;
const tk = `Language,Message,Image
x,"AR line\n******************\nEN line\n******************\nFR line",Images/Thank You Card.png
`;

describe("import snapshot", () => {
  it("converts TND to integer cents and rejects a third decimal", () => {
    expect(tndToCents("45")).toBe(4500);
    expect(tndToCents("1.2")).toBe(120);
    expect(() => tndToCents("45.555")).toThrow(/third decimal/);
  });

  it("splits a thank-you blob on asterisk lines into AR, EN, FR", () => {
    const split = splitThankYou("عربي\n***\nEnglish\n******************\nFrançais");
    expect(split.ar).toBe("عربي");
    expect(split.en).toBe("English");
    expect(split.fr).toBe("Français");
    expect(split.warned).toBe(false);
  });

  it("imports idempotently and does not trust the sheet available flag", () => {
    const db = openSqlite(":memory:");
    applyMigrations(db);
    const first = applyImport(db, {
      inventoryCsv: inventory,
      discountsCsv: discounts,
      governoratesCsv: governorates,
      delegationsCsv: delegations,
      tkCsv: tk,
      expected: { styles: 1, variants: 2, discounts: 2, governorates: 1, delegations: 1 },
    });
    return first.then((report) => {
      expect(report.ok).toBe(true);
      expect(report.availableMismatches.join(" ")).toContain("sheet 9 vs recomputed 1");
      expect(report.usedFlagMismatches.join(" ")).toContain("GIFT");
      expect(slugify("Bubblegum's Rock T-shirt")).toBe("bubblegums-rock-t-shirt");
      const price = db.prepare("SELECT price_cents FROM variants WHERE size = 'M'").get() as { price_cents: number };
      expect(price.price_cents).toBe(4550);
      const pending = db.prepare("SELECT pending_qty FROM variants WHERE size = 'S'").get() as { pending_qty: number };
      expect(pending.pending_qty).toBe(1);
      return applyImport(db, {
        inventoryCsv: inventory.replace("2,1,0,45", "9,0,0,45"),
        discountsCsv: discounts,
        governoratesCsv: governorates,
        delegationsCsv: delegations,
        tkCsv: tk,
        expected: { styles: 1, variants: 2, discounts: 2, governorates: 1, delegations: 1 },
      }).then((second) => {
        expect(second.ok).toBe(true);
        const again = db.prepare("SELECT quantity FROM variants WHERE size = 'S'").get() as { quantity: number };
        expect(again.quantity).toBe(9);
      });
    });
  });
});
