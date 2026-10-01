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

  function clear() {
    firstName.value = "";
    lastName.value = "";
    phone.value = "";
    governorateId.value = "";
    delegationId.value = "";
    social.value = "";
    address.value = "";
  }

  return { firstName, lastName, phone, governorateId, delegationId, social, address, clear };
});
