import { expect, test } from "@playwright/test";

test("home shows an in-stock photo and shop search, paging, and single-size add", async ({ page }) => {
  await page.goto("/fr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Collectionne les mignons");
  await expect(page.getByRole("heading", { name: "Cassette Tee" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gone Pin" })).toHaveCount(0);

  await page.getByRole("link", { name: "Tout voir" }).first().click();
  await expect(page).toHaveURL(/\/fr\/shop/);
  await expect(page.getByRole("heading", { name: "Tous les produits" })).toBeVisible();

  await page.getByLabel("Chercher des goodies").fill("Gone");
  await expect(page).toHaveURL(/q=Gone/);
  await expect(page.getByRole("heading", { name: "Gone Pin" })).toBeVisible();
  await expect(page.getByText("Indisponible")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajouter au panier" })).toHaveCount(0);

  await page.getByRole("button", { name: "Tous les articles" }).click();
  await page.getByLabel("Chercher des goodies").fill("Night Cat");
  const night = page.getByRole("article").filter({ hasText: "Night Cat Tee" });
  await expect(night.getByRole("button", { name: "Ajouter au panier" })).toHaveCount(0);
  await expect(night.getByText("S–M")).toBeVisible();

  await page.getByLabel("Chercher des goodies").fill("Cassette");
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await page.getByRole("link", { name: "Panier" }).click();
  await expect(page.getByRole("heading", { name: "Cassette Tee" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Augmenter la quantité" })).toBeEnabled();

  await page.goto("/fr/shop?page=2");
  await expect(page.getByRole("heading", { name: "Paged 12" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cassette Tee" })).toHaveCount(0);

  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/shop\?page=2/);
  await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();
});

test("product page follows the selected price and stops at stock", async ({ page }) => {
  await page.goto("/fr/p/hello-hoodie");
  await expect(page.getByRole("heading", { name: "Hello Hoodie" })).toBeVisible();
  await expect(page.getByText("Soft fleece")).toBeVisible();
  await expect(page.getByText("Choisis ta taille")).toBeVisible();
  await expect(page.getByText("60 DT")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "S", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "L Oversize", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "M", exact: true }).click();
  await expect(page.getByRole("button", { name: "M", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("62 DT")).toHaveCount(2);
  await expect(page.getByText("70 DT")).toHaveCount(0);

  await page.getByRole("button", { name: /Ajouter au panier/ }).click();
  await expect(page).toHaveURL(/\/fr\/p\/hello-hoodie/);
  await expect(page.getByRole("link", { name: "Panier" })).toContainText("1");
  await page.getByRole("button", { name: /Ajouter au panier/ }).click();
  await expect(page.getByText("C'est tout ce qu'il reste.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Panier" })).toContainText("1");

  await page.getByRole("link", { name: "Retour à la boutique" }).click();
  await expect(page).toHaveURL(/\/fr\/shop$/);
});

test("sold-out, shade, and reference products keep their own rows", async ({ page }) => {
  await page.goto("/en/p/sold-tee");
  await expect(page.getByText("Pick your size")).toBeVisible();
  await expect(page.getByText("45 DT")).toHaveCount(1);
  await expect(page.getByText("50 DT")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "S", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "M", exact: true })).toBeDisabled();
  await expect(page.getByText("Unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: /Add to cart/ })).toHaveCount(0);
  await expect(page.getByText("Packed with care")).toBeVisible();

  await page.goto("/fr/p/friends-trip");
  await expect(page.getByRole("heading", { name: "Friends Trip" })).toBeVisible();
  await expect(page.getByText("SHEGLAM Hello Kitty - Cream Blush")).toBeVisible();
  await expect(page.getByText("Choisis ta taille")).toHaveCount(0);
  await expect(page.getByText("Choisis", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Image du produit")).toBeVisible();

  await page.goto("/fr/p/pin-set");
  await expect(page.getByText("Choisis", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Axe", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Wood Block", exact: true })).toBeDisabled();

  await page.goto("/fr/p/gone");
  await expect(page.getByRole("button", { name: "U", exact: true })).toBeDisabled();
  await expect(page.getByText("Indisponible")).toBeVisible();
});

test("a shop card opens its product", async ({ page }) => {
  await page.goto("/fr/shop");
  await page.getByLabel("Chercher des goodies").fill("Cassette");
  await page.getByRole("link", { name: "Voir l'article" }).click();
  await expect(page).toHaveURL(/\/fr\/p\/tee-1/);
  await expect(page.getByText("TEE-1")).toBeVisible();
  await expect(page.getByText("Soft tee")).toBeVisible();
  await expect(page.getByRole("button", { name: "S", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Ajouter au panier/ }).click();
  await expect(page.getByRole("link", { name: "Panier" })).toContainText("1");
});

test("product page stays usable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fr/p/hello-hoodie");
  await expect(page.getByRole("link", { name: "Retour à la boutique" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Accueil" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tout voir" })).toBeVisible();
  await expect(page.getByRole("button", { name: "M", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "M", exact: true }).click();
  await expect(page.getByText("62 DT")).toHaveCount(2);
  await expect(page.getByText("Emballé avec soin")).toBeVisible();
  await expect(page.getByRole("button", { name: /Ajouter au panier/ })).toBeVisible();
});

test("phone header keeps home and shop links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fr/shop");
  await expect(page.getByRole("link", { name: "Accueil" })).toBeVisible();
  await page.getByRole("link", { name: "Accueil" }).click();
  await expect(page).toHaveURL(/\/fr$/);
});

test("empty bag, quantity, delivery, and promo", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/fr/cart");
  await expect(page.getByRole("heading", { name: "Ton sac attend son premier trésor." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continuer" })).toBeVisible();
  await expect(page.getByText("Votre panier (0)")).toBeVisible();
  await page.getByRole("link", { name: "Voir tous les goodies" }).click();
  await expect(page).toHaveURL(/\/fr\/shop/);

  await page.getByLabel("Chercher des goodies").fill("Cassette");
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await page.getByRole("link", { name: "Panier" }).click();
  const summary = page.getByRole("complementary", { name: "Récapitulatif" });
  await expect(page.getByRole("heading", { name: "Sac de goodies" })).toBeVisible();
  await expect(page.getByText("#TEE-1 · S")).toBeVisible();
  await expect(summary.getByText("45 DT", { exact: true })).toBeVisible();
  await expect(summary.getByText("8 DT", { exact: true })).toBeVisible();
  await expect(summary.getByText("53 DT", { exact: true })).toBeVisible();
  await expect(page.getByText("Votre panier (1)")).toBeVisible();

  await page.getByRole("button", { name: "Augmenter la quantité" }).click();
  await expect(page.getByText("Votre panier (2)")).toBeVisible();
  await expect(summary.getByText("90 DT", { exact: true })).toBeVisible();
  await expect(summary.getByText("98 DT", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Augmenter la quantité" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Diminuer la quantité" })).toBeEnabled();

  await page.getByLabel("Bande promo").fill("NEED2");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(summary.getByText("-1 DT", { exact: true })).toBeVisible();
  await expect(summary.getByText("97 DT", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Diminuer la quantité" }).click();
  await expect(page.getByText("Ton sac n'atteint pas le minimum de ce code.")).toBeVisible();
  await expect(summary.getByText("Réduction")).toHaveCount(0);
  await expect(summary.getByText("53 DT", { exact: true })).toBeVisible();

  await page.getByLabel("Bande promo").fill("NOPE");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page.getByText("Code inconnu.")).toBeVisible();

  await page.getByLabel("Bande promo").fill("FIVE");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(summary.getByText("-5 DT", { exact: true })).toBeVisible();
  await expect(summary.getByText("48 DT", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retirer le code" }).click();
  await expect(summary.getByText("53 DT", { exact: true })).toBeVisible();
  await expect(summary.getByText("Réduction")).toHaveCount(0);

  await page.getByRole("link", { name: "Commander" }).click();
  await expect(page).toHaveURL(/\/fr\/checkout/);
  await page.goto("/fr/cart");
  await page.getByRole("button", { name: "Retirer Cassette Tee" }).click();
  await expect(page.getByRole("heading", { name: "Ton sac attend son premier trésor." })).toBeVisible();
});

test("a saved bag refreshes price and stock before quoting", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pocochic.cart.v1", JSON.stringify({
      promoCode: "FIVE",
      lines: [{
        variantId: "var-a",
        quantity: 5,
        slug: "tee-1",
        itemCode: "TEE-1",
        displayName: "Old name",
        size: "S",
        reference: "",
        unitPriceCents: 1000,
        imagePath: null,
        availableQty: 9,
      }],
    }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fr/cart");
  await expect(page.getByRole("heading", { name: "Cassette Tee" })).toBeVisible();
  await expect(page.getByText("Old name")).toHaveCount(0);
  await expect(page.getByText("Ton sac a été mis à jour selon ce qu'il reste.")).toBeVisible();
  await expect(page.getByText("Votre panier (2)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Augmenter la quantité" })).toBeDisabled();
  const summary = page.getByRole("complementary", { name: "Récapitulatif" });
  await expect(summary.getByText("-5 DT", { exact: true })).toBeVisible();
  await expect(summary.getByText("93 DT", { exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test("arabic cart stays inside a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/cart");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "كيسك ينتظر أول كنز." })).toBeVisible();
  await expect(page.getByRole("link", { name: "تابع التصفح" })).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem("pocochic.cart.v1", JSON.stringify({
      promoCode: "",
      lines: [{
        variantId: "var-a",
        quantity: 1,
        slug: "tee-1",
        itemCode: "TEE-1",
        displayName: "Cassette Tee",
        size: "S",
        reference: "",
        unitPriceCents: 4500,
        imagePath: "/catalog/styles/tee-1.webp",
        availableQty: 2,
      }],
    }));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "كيس الكنوز" })).toBeVisible();
  const summary = page.getByRole("complementary", { name: "ملخص الطلب" });
  await expect(summary.getByText("53 DT", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "إتمام الطلب" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test("an empty checkout returns to the cart", async ({ page }) => {
  await page.goto("/fr/checkout");
  await expect(page).toHaveURL(/\/fr\/cart$/);
  await expect(page.getByRole("heading", { name: "Ton sac attend son premier trésor." })).toBeVisible();
});

test("confirmation without an order returns home", async ({ page }) => {
  await page.goto("/fr/confirmation");
  await expect(page).toHaveURL(/\/fr$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Collectionne les mignons");
});

test("checkout keeps typed details for this tab and drops a code the bag cannot use", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pocochic.cart.v1", JSON.stringify({
      promoCode: "NEED2",
      lines: [{
        variantId: "var-a",
        quantity: 1,
        slug: "tee-1",
        itemCode: "TEE-1",
        displayName: "Cassette Tee",
        size: "S",
        reference: "",
        unitPriceCents: 4500,
        imagePath: null,
        availableQty: 2,
      }],
    }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fr/checkout");
  await expect(page.getByRole("heading", { name: "Où envoie-t-on tes goodies ?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Retour au sac" })).toBeVisible();
  await expect(page.getByText("Commande", { exact: true })).toBeVisible();
  const summary = page.getByRole("complementary", { name: "Récapitulatif" });
  await expect(page.getByText("Ton sac n'atteint pas le minimum de ce code.")).toBeVisible();
  await expect(summary.getByText("Réduction")).toHaveCount(0);
  await expect(summary.getByText("53 DT", { exact: true })).toBeVisible();
  await expect(summary.getByText("8 DT", { exact: true })).toBeVisible();

  await page.getByLabel("Prénom").fill("Amira");
  await page.reload();
  await expect(page.getByLabel("Prénom")).toHaveValue("");
  await page.getByLabel("Prénom").fill("Amira");
  await page.getByRole("link", { name: "Retour au sac" }).click();
  await expect(page).toHaveURL(/\/fr\/cart$/);
  await page.getByRole("link", { name: "Commander" }).click();
  await expect(page.getByLabel("Prénom")).toHaveValue("Amira");

  await page.getByLabel("Adresse exacte").fill("a".repeat(81));
  await expect(page.getByText("80 caractères maximum.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Envoyer la commande" })).toBeDisabled();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test("checkout places the order and confirmation survives refresh", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pocochic.cart.v1", JSON.stringify({
      promoCode: "FIVE",
      lines: [{
        variantId: "vx-1",
        quantity: 1,
        slug: "paged-1",
        itemCode: "Paged 01",
        displayName: "Paged 01",
        size: "",
        reference: "",
        unitPriceCents: 1000,
        imagePath: null,
        availableQty: 1,
      }],
    }));
  });
  await page.goto("/fr/cart");
  await page.getByRole("link", { name: "Commander" }).click();
  await expect(page).toHaveURL(/\/fr\/checkout/);
  const summary = page.getByRole("complementary", { name: "Récapitulatif" });
  await expect(summary.getByText("-5 DT", { exact: true })).toBeVisible();
  await expect(summary.getByText("13 DT", { exact: true })).toBeVisible();

  await page.getByRole("textbox", { name: "Prénom *" }).fill("Amira");
  await page.getByRole("textbox", { name: "Nom *", exact: true }).fill("Ben Salem");
  await page.getByLabel("Téléphone").fill("22 123 456");
  await page.getByLabel("Gouvernorat").selectOption({ label: "Tunis" });
  await page.getByLabel("Ville").selectOption({ label: "Bab Bhar" });
  await page.getByLabel("Instagram / Facebook").fill("asma.ben.salem");
  await page.getByLabel("Adresse exacte").fill("Rue de la liberté");
  await page.getByRole("button", { name: "Envoyer la commande" }).click();

  await expect(page).toHaveURL(/\/fr\/confirmation/);
  await expect(page.getByRole("heading", { name: "Merci de croire en Pocochic !" })).toBeVisible();
  await expect(page.getByText(/POC-\d+/)).toBeVisible();
  await expect(page.getByText("Merci pour ta commande")).toBeVisible();
  await expect(page.getByRole("link", { name: "Accueil" })).toBeVisible();
  const orderNumber = (await page.getByText(/POC-\d+/).textContent()) ?? "";

  await page.reload();
  await expect(page.getByText(orderNumber)).toBeVisible();

  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/confirmation/);
  await expect(page.getByRole("heading", { name: "Thanks for believing in Pocochic!" })).toBeVisible();
  await expect(page.getByText("FULL")).toBeVisible();
  await expect(page.getByText(orderNumber)).toBeVisible();

  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\/fr\/cart$/);
});

test("checkout names a piece that sold out and leaves the bag", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pocochic.cart.v1", JSON.stringify({
      promoCode: "",
      lines: [{
        variantId: "vx-2",
        quantity: 1,
        slug: "paged-2",
        itemCode: "Paged 02",
        displayName: "Paged 02",
        size: "",
        reference: "",
        unitPriceCents: 1000,
        imagePath: null,
        availableQty: 1,
      }],
    }));
  });
  await page.goto("/fr/checkout");
  await expect(page.getByRole("button", { name: "Envoyer la commande" })).toBeEnabled();
  const taken = await page.request.post("http://127.0.0.1:8799/checkout", {
    data: {
      locale: "fr",
      customer: { fullName: "Autre Client", phone: "98111222", governorateId: "gov1", delegationId: "del1", city: "Centre" },
      lines: [{ variantId: "vx-2", quantity: 1 }],
    },
  });
  expect(taken.ok()).toBeTruthy();
  await page.getByRole("textbox", { name: "Prénom *" }).fill("Amira");
  await page.getByRole("textbox", { name: "Nom *", exact: true }).fill("Ben Salem");
  await page.getByLabel("Téléphone").fill("22123456");
  await page.getByLabel("Gouvernorat").selectOption({ label: "Tunis" });
  await page.getByLabel("Ville").selectOption({ label: "Bab Bhar" });
  await page.getByLabel("Adresse exacte").fill("Rue courte");
  await page.getByRole("button", { name: "Envoyer la commande" }).click();
  await expect(page.getByText("Ces pièces n'ont plus assez de stock. Le sac n'a pas changé.")).toBeVisible();
  await expect(page.getByText("Paged 02 — 0")).toBeVisible();
  await expect(page).toHaveURL(/\/fr\/checkout/);
  await expect(page.getByRole("complementary", { name: "Récapitulatif" }).getByText("Paged 02")).toBeVisible();
});

test("arabic checkout stays inside a phone screen", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pocochic.cart.v1", JSON.stringify({
      promoCode: "",
      lines: [{
        variantId: "var-a",
        quantity: 1,
        slug: "tee-1",
        itemCode: "TEE-1",
        displayName: "Cassette Tee",
        size: "S",
        reference: "",
        unitPriceCents: 4500,
        imagePath: null,
        availableQty: 2,
      }],
    }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/checkout");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "إلى أين نرسل قطعك؟" })).toBeVisible();
  await expect(page.getByRole("link", { name: "العودة للكيس" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "ملخص الطلب" }).getByText("53 DT", { exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});
