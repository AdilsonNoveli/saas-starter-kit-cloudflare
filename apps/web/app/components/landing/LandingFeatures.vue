<template>
  <div class="px-4 sm:px-6 lg:px-8 xl:px-40">
    <div class="flex flex-wrap justify-center gap-4">
      <LandingFeatureCard
        v-for="feature in features"
        :key="feature.title"
        :icon="feature.icon"
        :title="feature.title"
        :description="feature.description"
        :subfeatures="feature.subfeatures"
        class="flex-grow"
      />
    </div>
  </div>
</template>

<script setup>
const features = [
  {
    icon: "i-lucide-users",
    title: "Authentication & Teams",
    description: "Ready-to-use authentication and team collaboration features.",
    subfeatures: [
      { text: "Multiple Auth Methods" },
      { text: "Team Workspace Management" },
      { text: "User Roles & Permissions" },
      { text: "Customizable Onboarding" },
      { text: "Profile Management" },
    ],
  },
  {
    icon: "i-lucide-circle-dollar-sign",
    title: "Payment Integration",
    description:
      "Pre-built payment system with popular providers. Easy to customize.",
    subfeatures: [
      { text: "Multiple Payment Providers" },
      { text: "Subscription Management" },
      { text: "Invoice Generation" },
      { text: "Flexible Pricing Plans" },
      { text: "Payment API Framework" },
    ],
  },
  {
    icon: "i-lucide-mail",
    title: "Email System",
    description:
      "Complete email solution with customizable templates and provider flexibility.",
    subfeatures: [
      { text: "Customizable Email Templates" },
      { text: "Multiple Provider Options" },
      { text: "Automated Notifications" },
      { text: "Transactional Emails" },
      { text: "Template Management" },
    ],
  },
  {
    icon: "i-lucide-file-text",
    title: "Content Management",
    description: "Built-in pages and content management system.",
    subfeatures: [
      { text: "Landing Page Builder" },
      { text: "Blog & Documentation System" },
      { text: "Content Search" },
      { text: "Page Templates" },
      { text: "Content API" },
    ],
  },
  {
    icon: "i-lucide-rocket",
    title: "Deployment Ready",
    description: "Deploy your SaaS anywhere with confidence.",
    subfeatures: [
      { text: "Cloud Infrastructure Setup" },
      { text: "Flexible Deployment Options" },
      { text: "Database Configuration" },
      { text: "CI/CD Pipeline" },
      { text: "Background Jobs" },
    ],
  },
  {
    icon: "i-lucide-sparkles",
    title: "Developer Tools",
    description:
      "Modern development stack with TypeScript and testing support.",
    subfeatures: [
      { text: "TypeScript Integration" },
      { text: "API Type Safety" },
      { text: "Code Quality Tools" },
      { text: "Modular Architecture" },
    ],
  },
  {
    icon: "i-lucide-database",
    title: "Data Layer",
    description: "Robust database and storage infrastructure.",
    subfeatures: [
      { text: "Database Setup" },
      { text: "File Storage" },
      { text: "Multiple Database Support" },
    ],
  },
  {
    icon: "i-lucide-globe",
    title: "Global Ready",
    description: "Built for international audiences and search engines.",
    subfeatures: [
      { text: "Multi-language Support" },
      { text: "SEO Optimization" },
      { text: "Social Media Integration" },
      { text: "Performance Optimization" },
    ],
  },
  {
    icon: "i-lucide-wrench",
    title: "Advanced Features",
    description: "Modern features to enhance your SaaS application.",
    subfeatures: [
      { text: "Analytics Integration" },
      { text: "AI Components" },
      { text: "Search Capabilities" },
      { text: "Feature Management" },
    ],
  },
];
</script>
