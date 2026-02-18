export default {
  template: `
    <div class="col-12 col-md-4">
      <img class="w-100" :src="product.previewUrl" />
    </div>
    <div class="col-12 col-md-8">
      <h1>{{ product.title || 'Loading...' }}</h1>
      <p>{{ product.price }}</p>
      <p>Slug: {{ slug }}</p>
      <p v-if="product.description" v-html="product.description"></p>
      <button v-if="product.id" @click="buyProduct(cart)">Buy Now</button>
      <router-link to="/">Back to list</router-link>
    </div>
  `,
  computed: {
    slug() {
      return this.$route.params.slug;
    },
  },
  data() {
    return { product: [] };
  },
  setup() {
    //    const products = Vue.inject("products");
    const fetchProducts = Vue.inject("fetchProducts");

    Vue.onMounted(async () => {
      await fetchProducts();
      // now products.value contains everything you need
    });
  },
  async mounted() {
    try {
      const subscriptionUid = Vue.inject("subscriptionUid");
      const productMap = Vue.inject("productMap");
      const buyProduct = Vue.inject("buyProduct");
      const productId = productMap.value[this.slug];

      if (!productId) {
        console.warn("Product slug not found in map:", this.slug);
        return;
      }

      const res = await fetch(
        "https://api.theideacrowd.co.uk/api/product/" + productId,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription_uid: subscriptionUid,
          }),
        }
      );
      const data = await res.json();

      console.log(data);

      this.product = data;
      this.buyProduct = buyProduct;
    } catch (err) {
      console.error("Failed to fetch product details:", err);
    }
  },
};
