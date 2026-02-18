export default {
  template: `
    <div>
      <!-- Floating Cart Button -->
      <button 
        class="cart-btn position-fixed top-0 end-0 m-3 z-3"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#cartOffcanvas"
        aria-controls="cartOffcanvas"
      >
        <img
          id="header-logo"
          src="/src/assets/icons/cart.svg"
          class="w-100"
          alt="GiftShelf"
          style="cursor: pointer"
        />
        <span class="cart-badge">{{ totalItems }}</span>
      </button>

      <!-- Offcanvas Sidebar -->
      <div 
        class="offcanvas offcanvas-end" 
        tabindex="-1" 
        id="cartOffcanvas" 
        aria-labelledby="cartOffcanvasLabel"
      >
        <div class="offcanvas-header">
          <h5 class="offcanvas-title" id="cartOffcanvasLabel">Your Swag</h5>
          <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>

        <div class="offcanvas-body">
          <div v-if="cart.length === 0" class="text-muted text-center mt-3">
            Your cart is empty
          </div>

          <ul v-else class="list-group mb-3">
            <li 
              v-for="(item, index) in cart" 
              :key="index"
              class="list-group-item d-flex justify-content-between align-items-center"
            >
              <div class="d-flex align-items-center">
                <img :src="item.imageUrl" width="50" class="me-3" :alt="item.name" />
                <div>
                  <div>{{ item.name }}</div>
                  <div class="text-muted small">Qty: {{ item.quantity }}</div>
                </div>
              </div>

              <div class="d-flex align-items-center">
                <button 
                  @click="decreaseQty(item)"
                  class="btn btn-sm btn-outline-secondary me-2"
                  :disabled="item.quantity <= 1"
                >−</button>

                <button 
                  @click="increaseQty(item)"
                  class="btn btn-sm btn-outline-secondary me-2"
                >+</button>

                <button 
                  @click="removeFromCart(item)"
                  class="btn btn-sm btn-outline-danger"
                >
                  Remove
                </button>
              </div>
            </li>
          </ul>

          <button 
            class="btn btn-success w-100"
            :disabled="cart.length === 0"
            @click="goToCheckout"
            data-bs-dismiss="offcanvas"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  `,
  setup() {
    const cart = Vue.inject("cart");
    const removeFromCart = Vue.inject("removeFromCart");
    const addToCart = Vue.inject("addToCart");
    const router = VueRouter.useRouter();

    const goToCheckout = () => router.push("/checkout");

    const increaseQty = (item) => addToCart(item);

    const decreaseQty = (item) => {
      const existing = cart.value.find((p) => p.id === item.id);
      if (existing && existing.quantity > 1) {
        existing.quantity -= 1;
      }
    };

    const totalItems = Vue.computed(() =>
      cart.value.reduce((sum, item) => sum + item.quantity, 0),
    );

    return {
      cart,
      removeFromCart,
      goToCheckout,
      increaseQty,
      decreaseQty,
      totalItems,
    };
  },
};
