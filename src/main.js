import CartSidebar from "./components/CartSidebar.js";
import Checkout from "./components/Checkout.js";
import ImageCarousel from "./components/ImageCarousel.js";
import Order from "./components/Order.js";
import ProductDetail from "./components/ProductDetail.js";

const { createApp, ref } = Vue;
const { createRouter, createWebHistory } = VueRouter;

const subscriptionUid = "6a067d1c-bca8-4df6-947e-b6553862e27f";
const cdnUrl = "https://cdn.giftshelf.co.uk/";

const ProductList = {
  components: { ImageCarousel },
  template: `
<div class="col-md-4" v-for="product in products" :key="product.id">
  <div class="card mb-4">
    <ImageCarousel
      :images="productCarouselImages(product)"
      :altTexts="productCarouselAltTexts(product)"
      :activeIndex="product.activeIndex"
      :carouselId="'carousel-' + product.id"
      @update:activeIndex="(idx) => product.activeIndex = idx"
    />
    <div class="card-body">
      <router-link :to="'/product/' + product.slug">
        <h5 class="card-title">{{ product.name }}</h5>
        <p>&pound;{{ product.price }}</p>
      </router-link>

      <div v-if="product.attributes" class="mb-3">
        <div
          v-for="(values, attrName) in product.attributes"
          :key="attrName"
          class="mb-2"
        >
          <label class="form-label">{{ attrName }}</label>

          <select
            class="form-select"
            v-model="product.selectedAttributes[attrName]"
            @change="updateVariantSelection(product)"
          >
            <option disabled value="">
              Choose {{ attrName.toLowerCase() }}
            </option>

            <option
              v-for="option in availableAttributeValues(product, attrName)"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
            >
              {{ option.value }}
            </option>
          </select>
        </div>
      </div>

      <button
        class="btn btn-primary w-100"
        :disabled="
          product.variants &&
          Object.keys(product.attributes || {}).some(
            k => !product.selectedAttributes[k]
          )
        "
        @click="addToCart(selectedVariant(product) || product)"
      >
        Add to Swag
      </button>
    </div>
  </div>
</div>
  `,
  setup() {
    const cart = Vue.inject("cart");
    const addToCart = Vue.inject("addToCart");
    const removeFromCart = Vue.inject("removeFromCart");
    const products = Vue.inject("products");
    const fetchProducts = Vue.inject("fetchProducts");

    function productCarouselImages(product) {
      const images = [product.imageUrl];

      if (product.variants && product.variants.length) {
        product.variants.forEach((v) => images.push(v.imageUrl));
      }

      return images;
    }

    function productCarouselAltTexts(product) {
      const altTexts = [product.name];

      if (product.variants && product.variants.length) {
        product.variants.forEach((v) =>
          altTexts.push(`${product.name} - ${v.name}`),
        );
      }

      return altTexts;
    }

    function getVariantByAttributes(product, attrs) {
      return product.variants.find((variant) =>
        Object.entries(attrs).every(([k, v]) => variant.attributes?.[k] === v),
      );
    }

    function setDefaultAttributes(product) {
      const firstVariant = product.variants[0];

      product.selectedAttributes = { ...firstVariant.attributes };
      product.selectedVariant = firstVariant;
      product.activeIndex = product.variants.indexOf(firstVariant) + 1;
    }

    function updateVariantSelection(product) {
      const variant = getVariantByAttributes(
        product,
        product.selectedAttributes,
      );

      if (variant) {
        product.selectedVariant = variant;
        product.activeIndex = product.variants.indexOf(variant) + 1;
        return;
      }

      const validVariant = product.variants.find((v) =>
        Object.entries(product.selectedAttributes).every(
          ([k, v2]) => !v2 || v.attributes?.[k] === v2,
        ),
      );

      if (validVariant) {
        product.selectedVariant = validVariant;
        product.selectedAttributes = { ...validVariant.attributes };
        product.activeIndex = product.variants.indexOf(validVariant) + 1;
      }
    }

    function availableAttributeValues(product, attrName) {
      if (!product.attributes) return [];

      return product.attributes[attrName].map((value) => ({
        value,
        disabled: !isValidCombination(product, attrName, value),
      }));
    }

    function isValidCombination(product, attrName, value) {
      const selected = { ...product.selectedAttributes, [attrName]: value };

      return product.variants.some((variant) =>
        Object.entries(selected).every(
          ([k, v]) => !v || variant.attributes?.[k] === v,
        ),
      );
    }

    function selectedVariant(product) {
      return product.variants.find((variant) =>
        Object.entries(product.selectedAttributes).every(
          ([key, value]) => variant.attributes?.[key] === value,
        ),
      );
    }

    Vue.onMounted(async () => {
      await fetchProducts();
    });

    return {
      products,
      cart,
      addToCart,
      removeFromCart,
      productCarouselImages,
      productCarouselAltTexts,
      availableAttributeValues,
      selectedVariant,
      updateVariantSelection,
      setDefaultAttributes,
    };
  },
};

// Routes
const routes = [
  { path: "/", component: ProductList },
  { path: "/product/:slug", component: ProductDetail },
  { path: "/checkout", component: Checkout },
  { path: "/order-complete", component: Order },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp({
  components: { CartSidebar },
  template: `
    <div class="row">
      <router-view></router-view>
      <CartSidebar />
    </div>
  `,
  setup() {
    const cart = ref([]);
    const products = ref([]);
    const productMap = ref({});
    let fetchPromise = null;

    const fetchProducts = async () => {
      if (products.value.length > 0) return;
      if (fetchPromise) return fetchPromise;

      fetchPromise = (async () => {
        try {
          const res = await fetch(
            "https://api.theideacrowd.co.uk/api/products",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscription_uid: subscriptionUid,
              }),
            },
          );
          const data = await res.json();
          products.value = data;

          products.value = data.map((p) => {
            p.imageUrl = cdnUrl + p.imageUrl;
            p.activeIndex = 0;

            if (p.variants && p.variants.length) {
              p.selectedAttributes = {};
              p.attributes = {};

              p.variants = p.variants.map((v) => {
                v.imageUrl = cdnUrl + v.imageUrl;
                return v;
              });

              p.variants.forEach((variant) => {
                Object.entries(variant.attributes || {}).forEach(
                  ([key, value]) => {
                    if (!p.attributes[key]) {
                      p.attributes[key] = new Set();
                    }
                    p.attributes[key].add(value);
                  },
                );
              });

              Object.keys(p.attributes).forEach((key) => {
                p.attributes[key] = [...p.attributes[key]];
              });

              // ⚠️ IMPORTANT: setDefaultAttributes is inside ProductList setup()
              // so we must call it via the function reference here:
              ProductList.setup().setDefaultAttributes(p);
            }

            return p;
          });

          data.forEach((p) => {
            productMap.value[p.slug] = p.id;
          });
        } catch (err) {
          console.error("Failed to fetch products:", err);
        }
      })();

      await fetchPromise;
    };

    const addToCart = (product) => {
      const existing = cart.value.find((p) => p.id === product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.value.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.imageUrl,
          quantity: 1,
        });
      }
    };

    const removeFromCart = (product) => {
      cart.value = cart.value.filter((p) => p.id !== product.id);
    };

    const buyProduct = async (cartRef, shipping) => {
      try {
        const res = await fetch(
          "https://api.theideacrowd.co.uk/api/payment-intent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              products: cartRef.value.map((item) => ({
                product_id: item.id,
                quantity: item.quantity,
              })),
              shipping: {
                name: shipping.name,
                email: shipping.email,
                phone: shipping.phone,
                address_line_1: shipping.addressLine1,
                address_line_2: shipping.addressLine2,
                city: shipping.city,
                postcode: shipping.postcode,
                shipping_method_uid: shipping.shippingMethodUid,
              },
            }),
          },
        );

        const data = await res.json();

        if (!data.clientSecret) {
          console.error("Missing payment intent clientSecret");
          alert("Unable to start payment");
          return;
        }

        localStorage.setItem("clientSecret", data.clientSecret);
        router.push("/order");
      } catch (err) {
        console.error("Payment intent error:", err);
      }
    };

    Vue.provide("cart", cart);
    Vue.provide("products", products);
    Vue.provide("productMap", productMap);

    Vue.provide("addToCart", addToCart);
    Vue.provide("removeFromCart", removeFromCart);
    Vue.provide("buyProduct", buyProduct);
    Vue.provide("fetchProducts", fetchProducts);

    Vue.provide("subscriptionUid", subscriptionUid);
    Vue.provide("cdnUrl", cdnUrl);

    fetchProducts();

    return {};
  },
});

app.use(router);
app.mount("#app");

const logo = document.getElementById("header-logo");
if (logo) {
  logo.addEventListener("click", (e) => {
    e.preventDefault();
    router.push("/");
  });
}
