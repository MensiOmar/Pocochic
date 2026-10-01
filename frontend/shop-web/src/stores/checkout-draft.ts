import { defineStore } from "pinia";
import { ref } from "vue";

const IDEMPOTENCY_STORAGE_KEY = "pocochic.checkout.idempotency.v1";
const IDEMPOTENCY_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readAttempt(): { key: string; fingerprint: string } {
  try {
    const raw = JSON.parse(globalThis.sessionStorage?.getItem(IDEMPOTENCY_STORAGE_KEY) ?? "") as unknown;
    if (!raw || typeof raw !== "object") return { key: crypto.randomUUID(), fingerprint: "" };
    const record = raw as { key?: unknown; fingerprint?: unknown };
    if (typeof record.key !== "string" || !IDEMPOTENCY_KEY.test(record.key) || typeof record.fingerprint !== "string") {
      return { key: crypto.randomUUID(), fingerprint: "" };
    }
    return { key: record.key, fingerprint: record.fingerprint };
  } catch {
    return { key: crypto.randomUUID(), fingerprint: "" };
  }
}

function writeAttempt(key: string, fingerprint: string) {
  try {
    globalThis.sessionStorage?.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify({ key, fingerprint }));
  } catch {
    // sessionStorage can throw in private mode; the in-memory key still covers this page.
  }
}

function forgetAttempt() {
  try {
    globalThis.sessionStorage?.removeItem(IDEMPOTENCY_STORAGE_KEY);
  } catch {
    // sessionStorage can throw in private mode; clear() still rotates the in-memory key.
  }
}

export const useCheckoutDraftStore = defineStore("checkout-draft", () => {
  const firstName = ref("");
  const lastName = ref("");
  const phone = ref("");
  const governorateId = ref("");
  const delegationId = ref("");
  const social = ref("");
  const address = ref("");
  const storedAttempt = readAttempt();
  const idempotencyKey = ref(storedAttempt.key);
  const idempotencyFingerprint = ref(storedAttempt.fingerprint);

  function keyFor(fingerprint: string): string {
    if (fingerprint !== idempotencyFingerprint.value) {
      idempotencyFingerprint.value = fingerprint;
      idempotencyKey.value = crypto.randomUUID();
    }
    writeAttempt(idempotencyKey.value, idempotencyFingerprint.value);
    return idempotencyKey.value;
  }

  function clear() {
    firstName.value = "";
    lastName.value = "";
    phone.value = "";
    governorateId.value = "";
    delegationId.value = "";
    social.value = "";
    address.value = "";
    idempotencyKey.value = crypto.randomUUID();
    idempotencyFingerprint.value = "";
    forgetAttempt();
  }

  return { firstName, lastName, phone, governorateId, delegationId, social, address, keyFor, clear };
});
