<template>
  <div>
    <LandingHero />
    <LandingProblem />
    <!-- Below the first screen: hydrated when they scroll into view, so the first load pays only for the hero -->
    <LazyLandingOutcomes hydrate-on-visible />
    <LazyLandingMethod hydrate-on-visible />
    <LazyLandingAudience hydrate-on-visible />
    <LazyLandingProof hydrate-on-visible />
    <LazyLandingOffer hydrate-on-visible />
  </div>
</template>

<script setup lang="ts">
import { offerSchema } from "~/utils/offer";

definePageMeta({
  layout: "page",
  auth: false,
});
const { t } = useI18n();
const { offer, launchOpen } = useOffer();
const localePath = useLocalePath();
const site = useSiteConfig();

useSeoMeta({
  // Function form so the title and description re-resolve when the locale changes instead of
  // being frozen at setup time.
  title: () => t("landing.seoTitle"),
  description: () => t("landing.seoDescription"),
});

// A software application with its offer, at the price the page shows. No rating, review or FAQ:
// none is backed by reviews that can be shown (SPEC-0003 FR-008). Each language is its own
// prerendered route, so the node is built once per route.
const { "@context": _context, ...softwareApp } = offerSchema(
  offer,
  { name: site.name, url: `${site.url}${localePath("/")}`.replace(/(.)\/$/, "$1"), description: t("landing.seoDescription") },
  launchOpen,
);
useSchemaOrg([softwareApp]);
</script>
