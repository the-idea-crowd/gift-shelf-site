export default {
  template: `
    <div>
      <h1>Order Status</h1>

      <!-- Loading -->
      <div v-if="loading">
        <p>Checking your order...</p>
        <div class="spinner-border" role="status"></div>
      </div>

      <!-- Success -->
      <div v-if="success">
        <p class="text-success">
          Thank you! Your order has been placed. A confirmation email has been sent.
        </p>
      </div>

      <!-- Error -->
      <div v-if="error">
        <p class="text-danger">
          Sorry, we couldn't confirm your order.  
          If money was taken, it will automatically be refunded.
        </p>
      </div>
    </div>
  `,

  setup() {
    const subscriptionUid = Vue.inject("subscriptionUid");
    const loading = Vue.ref(true);
    const success = Vue.ref(false);
    const error = Vue.ref(false);

    Vue.onMounted(async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const pi = params.get("payment_intent");
        const secret = params.get("payment_intent_client_secret");
        const status = params.get("redirect_status");

        console.log("Stripe redirect:", { pi, secret, status });

        if (!secret || status !== "succeeded") {
          error.value = true;
          return;
        }

        // STEP 1: Verify PaymentIntent with backend
        const res = await fetch(
          "https://api.theideacrowd.co.uk/api/payment-intent-details",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientSecret: secret }),
          }
        );

        if (!res.ok) throw new Error("Failed fetching PI details");

        const data = await res.json();
        console.log("PI details:", data);

        const supplierOrderId = data?.metadata?.supplier_orders;

        if (!supplierOrderId) {
          console.error("Missing supplier_orders metadata");
          error.value = true;
          return;
        }

        // STEP 2: Activate order in backend
        const activateRes = await fetch(
          "https://api.theideacrowd.co.uk/api/new-order",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplierOrderId,
              subscription_uid: subscriptionUid,
            }),
          }
        );

        const json = await activateRes.json();
        console.log("Order activation:", json);

        if (!activateRes.ok || json?.status === "error") {
          error.value = true;
          return;
        }

        success.value = true;
      } catch (e) {
        console.error(e);
        error.value = true;
      } finally {
        loading.value = false;
      }
    });

    return { loading, success, error };
  },
};
