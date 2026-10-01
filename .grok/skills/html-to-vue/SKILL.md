---
name: html-to-vue
description: Implement owner-delivered HTML screen files into the existing Vite + Vue apps. Use when the user drops HTML mocks, screen designs, or asks to build/update shop-web or admin-web from HTML. Also /html-to-vue.
---

# HTML → Vue

Owner HTML is the look and structure. Product rules stay in the vault and APIs.

## Map the screen

| HTML (typical) | App | Existing entry |
|----------------|-----|----------------|
| listing / home / shop | `pocochic/frontend/shop-web` | `src/views/Home.vue`, `Listing.vue` |
| product / PDP | shop-web | `src/views/Detail.vue` |
| cart | shop-web | `src/views/Cart.vue` |
| checkout | shop-web | `src/views/Checkout.vue` |
| thank-you / confirmation | shop-web | `src/views/Confirmation.vue` |
| admin login | `pocochic/frontend/admin-web` | `src/views/Login.vue` |
| orders list | admin-web | `src/views/Orders.vue` |
| order detail | admin-web | `src/views/OrderDetail.vue` |

Shared shop chrome lives in `src/components/` (`Shell.vue`, `BrandLogo.vue`, …). Assets in `pocochic/frontend/assets/`.

## Do

1. Read the HTML (and any accompanying CSS). Match layout, spacing, and copy to Vue SFCs already in the app.
2. Keep Vue 3 + Vite + Vue Router + TypeScript. Reuse Pinia cart (`pocochic.cart.v1`) and existing `api.ts` / contracts.
3. Wire data through shop-api / admin-api. Do not hardcode catalog, prices, or stock in the Vue files.
4. RTL/locale: existing `i18n.ts` and `dir` handling; do not add vue-i18n unless the owner asks.
5. After UI changes, exercise the screen in the browser (desktop and a mobile width).

## Do not

- Scaffold a new SPA or switch to Next/Nuxt.
- Reimplement promo or stock math in the client.
- Invent screens the HTML did not include.
- Expand backend unless the mock requires an API the Worker does not have — then change the API in the matching `backend/*` package with a contract update.
