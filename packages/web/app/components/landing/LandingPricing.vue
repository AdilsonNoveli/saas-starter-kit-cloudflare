<template>
  <div id="landing-pricing">
    <LayoutSection :has-border="false">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold tracking-tight text-highlighted">
          Simple, Transparent Pricing
        </h2>
        <p class="mt-4 text-lg text-muted">
          One plan, everything included. Scale as you grow.
        </p>
      </div>

      <div class="grid grid-cols-1 max-w-md mx-auto">
        <PricingCard
          name="Example Plan"
          original-price="$49"
          price="$29"
          period="per month"
          description="Everything you need to launch and scale your SaaS"
          :features="[
            { text: 'Customizable Pricing Components', included: true },
            { text: 'Multiple Plan Support', included: true },
            { text: 'Subscription Management', included: true },
            { text: 'Usage-based Pricing Options', included: true },
            { text: 'Payment Provider Integration', included: true },
            { text: 'Billing Portal Integration', included: true },
            { text: 'Invoice Generation', included: true },
            { text: 'Trial Period Support', included: true },
            { text: 'Custom Plan Features', included: true },
          ]"
          button-text="Get Started"
          :is-featured="true"
        />
      </div>
    </LayoutSection>
  </div>
</template>

