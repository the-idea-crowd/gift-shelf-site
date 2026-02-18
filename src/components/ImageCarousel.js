// components/ImageCarousel.js
export default {
  props: {
    images: {
      type: Array,
      required: true,
    },
    altTexts: {
      type: Array,
      required: false,
      default: () => [],
    },
    activeIndex: {
      type: Number,
      required: true,
    },
    carouselId: {
      type: String,
      required: true,
    },
  },
  emits: ["update:activeIndex"],
  template: `
    <div :id="carouselId" class="carousel slide" data-bs-touch="true">
      <div class="carousel-inner">
        <div
          v-for="(img, idx) in images"
          :key="idx"
          class="carousel-item"
          :class="{ active: idx === activeIndex }"
        >
          <img :src="img" class="d-block w-100" :alt="altTexts[idx] || 'Product image'" />
        </div>
      </div>

      <button
        class="carousel-control-prev"
        type="button"
        :data-bs-target="'#' + carouselId"
        data-bs-slide="prev"
        @click="prev"
      >
        <span class="carousel-control-prev-icon"></span>
      </button>

      <button
        class="carousel-control-next"
        type="button"
        :data-bs-target="'#' + carouselId"
        data-bs-slide="next"
        @click="next"
      >
        <span class="carousel-control-next-icon"></span>
      </button>
    </div>
  `,
  methods: {
    next() {
      const nextIndex = (this.activeIndex + 1) % this.images.length;
      this.$emit("update:activeIndex", nextIndex);
    },
    prev() {
      const prevIndex =
        (this.activeIndex - 1 + this.images.length) % this.images.length;
      this.$emit("update:activeIndex", prevIndex);
    },
  },
};
