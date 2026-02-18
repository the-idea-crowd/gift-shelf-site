export default {
  template: `
    <div>
      <!-- STEP 1: DELIVERY DETAILS -->
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button
            class="accordion-button"
            :class="{ collapsed: !step1Open }"
            type="button"
            @click="step1Open = !step1Open"
          >
            Delivery Details
          </button>
        </h2>
        <div class="accordion-collapse collapse" :class="{ show: step1Open }">
          <div class="accordion-body">
            <form @submit.prevent="getQuote">
              <div class="mb-3"><input type="text" class="form-control" v-model="shipping.name" placeholder="Full name" required /></div>
              <div class="mb-3"><input type="email" class="form-control" v-model="shipping.email" placeholder="Email" required /></div>
              <div class="mb-3"><input type="tel" class="form-control" v-model="shipping.phone" placeholder="Phone" /></div>
              <div class="mb-3"><input type="text" class="form-control" v-model="shipping.addressLine1" placeholder="Address Line 1" required /></div>
              <div class="mb-3"><input type="text" class="form-control" v-model="shipping.addressLine2" placeholder="Address Line 2" /></div>
              <div class="mb-3"><input type="text" class="form-control" v-model="shipping.city" placeholder="Town / City" required /></div>
              <div class="mb-3"><input type="text" class="form-control" v-model="shipping.postcode" placeholder="Postcode / Zip Code" required /></div>


              <button class="btn btn-primary" type="submit" :disabled="loading">
                <template v-if="loading">
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                </template>
                <template v-else>
                  Continue to Delivery
                </template>
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- STEP 2: SHIPPING OPTIONS -->
      <div v-if="quote" class="accordion-item mt-3">
        <h2 class="accordion-header">
          <button
            class="accordion-button"
            :class="{ collapsed: !step2Open }"
            type="button"
            @click="step2Open = !step2Open"
          >
            Shipping Options
          </button>
        </h2>
        <div class="accordion-collapse collapse" :class="{ show: step2Open }">
          <div class="accordion-body">
            <div class="mb-3">
              <select class="form-control" v-model="shipping.shippingMethodUid" @change="onShippingChange">
                <option
                  v-for="option in quote?.shippingOptions"
                  :key="option.shipmentMethodUid"
                  :value="option.shipmentMethodUid"
                >
                  {{ option.name }} - ({{ option.minDeliveryDays}} - {{ option.maxDeliveryDays}} days)- £{{ option.price.toFixed(2) }}
                </option>
              </select>
            </div>

            <div class="alert alert-info">
              Items: £{{ quote?.priceSubTotal.toFixed(2) }}  
              <br>
              Shipping: £{{ shipping.price.toFixed(2) }}
              <hr>
              <strong>Total: £{{ totalPrice.toFixed(2) }}</strong>
            </div>

            <button class="btn btn-primary" @click="openPayment" :disabled="!shipping.shippingMethodUid || paymentLoading">
              <template v-if="paymentLoading">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              </template>
              <template v-else>
                Continue to Payment
              </template>
            </button>
          </div>
        </div>
      </div>

      <!-- STEP 3: PAYMENT -->
      <div v-if="clientSecret" class="accordion-item mt-3">
        <h2 class="accordion-header">
          <button
            class="accordion-button"
            :class="{ collapsed: !step3Open }"
            type="button"
            @click="step3Open = !step3Open"
          >
            Payment Details
          </button>
        </h2>
        <div class="accordion-collapse collapse" :class="{ show: step3Open }">
          <div class="accordion-body">
            <div id="payment-element"></div>
            <button class="btn btn-success mt-3" @click="pay" :disabled="paying">
              {{ paying ? "Processing..." : "Pay Now" }}
            </button>
          </div>
        </div>
      </div>

      <router-link to="/" class="d-block mt-4">Back to list</router-link>
    </div>
  `,

  setup() {
    const subscriptionUid = Vue.inject("subscriptionUid");
    const cart = Vue.inject("cart");
    const buyProduct = Vue.inject("buyProduct");

    const loading = Vue.ref(false);
    const paymentLoading = Vue.ref(false);
    const quote = Vue.ref(null);
    const shipping = Vue.reactive({
      name: "",
      email: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postcode: "",
      shippingMethodUid: "",
      price: 0,
    });

    const totalPrice = Vue.computed(() => {
      const subTotal = quote.value?.priceSubTotal ?? 0;
      return subTotal + (shipping.price ?? 0);
    });

    // Accordion state
    const step1Open = Vue.ref(true);
    const step2Open = Vue.ref(false);
    const step3Open = Vue.ref(false);

    // Stripe
    const stripe = Stripe(
      "pk_test_51SGfbcBQmDoscts4bZj7AnIalTi21D4qnUVew98ei3uAgVZg6nw4TLONsc7VOKiijustE9JewmeKhMrFCuzzqL3a00CIv8NXkl",
    );
    const elements = Vue.ref(null);
    const clientSecret = Vue.ref(null);
    const paying = Vue.ref(false);

    // STEP 1: GET QUOTE
    const getQuote = async () => {
      if (!cart.value.length) {
        alert("Your cart is empty!");
        return;
      }

      loading.value = true;
      try {
        const res = await fetch("https://api.theideacrowd.co.uk/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: cart.value,
            shipping,
            subscription_uid: subscriptionUid,
          }),
        });

        quote.value = await res.json();

        const first = quote.value?.shippingOptions?.[0];
        if (first) {
          shipping.shippingMethodUid = first.shipmentMethodUid;
          shipping.price = first.price;
        }

        // Move to shipping step
        step1Open.value = false;
        step2Open.value = true;
      } catch (err) {
        console.error("Quote API error:", err);
        alert("Failed to get quote. Please try again.");
      } finally {
        loading.value = false;
      }
    };

    const onShippingChange = () => {
      const option = quote.value?.shippingOptions?.find(
        (opt) => opt.shipmentMethodUid === shipping.shippingMethodUid,
      );
      if (option) shipping.price = option.price;
    };

    const openPayment = async () => {
      if (paymentLoading.value) return; // prevent double click

      paymentLoading.value = true;
      await createPaymentIntent();
      paymentLoading.value = false;

      step2Open.value = false;
      step3Open.value = true;
    };

    const createPaymentIntent = async () => {
      if (!shipping.shippingMethodUid) return;

      try {
        const res = await fetch(
          "https://api.theideacrowd.co.uk/api/create-payment-intent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription_uid: subscriptionUid,
              cart: cart.value,
              shipping: {
                name: shipping.name,
                email: shipping.email,
                phone: shipping.phone,
                addressLine1: shipping.addressLine1,
                addressLine2: shipping.addressLine2,
                city: shipping.city,
                postcode: shipping.postcode,
                price: shipping.price,
                shippingMethodUid: shipping.shippingMethodUid,
              },
            }),
          },
        );

        const data = await res.json();
        clientSecret.value = data.clientSecret;

        // Wait a tick so the payment div exists in the DOM
        await Vue.nextTick();

        // Only create elements if not already created
        if (!elements.value) {
          elements.value = stripe.elements({ clientSecret: data.clientSecret });
        }

        // Remove old element if already mounted
        const oldEl = document.querySelector("#payment-element > *");

        if (oldEl) oldEl.remove();

        const paymentElement = elements.value.create("payment", {
          defaultValues: {
            billingDetails: {
              name: shipping.name,
              email: shipping.email,
              address: {
                line1: shipping.addressLine1,
                line2: shipping.addressLine2,
                city: shipping.city,
                postal_code: shipping.postcode,
              },
            },
          },
        });

        paymentElement.mount("#payment-element");
      } catch (err) {
        console.error("PaymentIntent creation error:", err);
        alert("Failed to prepare payment. Try again.");
      }
    };

    const pay = async () => {
      paying.value = true;
      const { error } = await stripe.confirmPayment({
        elements: elements.value,
        confirmParams: { return_url: "https://giftshelf.co.uk/order-complete" },
      });
      if (error) alert(error.message);
      paying.value = false;
    };

    return {
      cart,
      loading,
      paymentLoading,
      quote,
      shipping,
      totalPrice,
      clientSecret,
      paying,
      step1Open,
      step2Open,
      step3Open,
      getQuote,
      onShippingChange,
      openPayment,
      pay,
    };
  },
};
