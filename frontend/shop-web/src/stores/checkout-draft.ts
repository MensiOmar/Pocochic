import { defineStore } from "pinia";
import { ref } from "vue";

export const useCheckoutDraftStore = defineStore("checkout-draft", () => {
  const firstName = ref("");
  const lastName = ref("");
  const phone = ref("");
  const governorateId = ref("");
  const delegationId = ref("");
  const social = ref("");
  const address = ref("");
  const idempotencyKey = ref(crypto.randomUUID());
  const idempotencyFingerprint = ref("");

  function keyFor(fingerprint: string): string {
    if (fingerprint !== idempotencyFingerprint.value) {
      idempotencyFingerprint.value = fingerprint;
      idempotencyKey.value = crypto.randomUUID();
    }
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
  }

  return { firstName, lastName, phone, governorateId, delegationId, social, address, keyFor, clear };
});
