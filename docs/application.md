# Aplicação e implementações

<!-- specsfy:documentator:start -->
## Superfícies

Categorias: Serviços, Rotas e APIs, Páginas, Componentes, Testes e Outras fontes.

Relação: relaciona cada arquivo observado à sua superfície.

| Categoria | Arquivo | Símbolos |
| --- | --- | --- |
| Páginas | apps/app/app/app.config.ts | — |
| Páginas | apps/app/app/app.vue | — |
| Páginas | apps/app/app/assets/css/main.css | — |
| Componentes | apps/app/app/components/account/AccountUserDropdown.vue | — |
| Componentes | apps/app/app/components/account/MfaSetupModal.vue | startSetup, onSubmit |
| Componentes | apps/app/app/components/avatar/AvatarUploader.vue | triggerUpload, onFileChange |
| Componentes | apps/app/app/components/background/BackgroundDots.vue | — |
| Componentes | apps/app/app/components/ConfirmDialog.vue | settle |
| Componentes | apps/app/app/components/layout/LayoutContentPage.vue | — |
| Componentes | apps/app/app/components/layout/LayoutSection.vue | — |
| Componentes | apps/app/app/components/loader/LoaderSpin.vue | — |
| Componentes | apps/app/app/components/settings/SettingsPanel.vue | — |
| Componentes | apps/app/app/components/team-dashboard/TeamDashboardActivity.vue | UAvatar, UBadge |
| Componentes | apps/app/app/components/team-dashboard/TeamDashboardChart.client.vue | — |
| Componentes | apps/app/app/components/team-dashboard/TeamDashboardChart.server.vue | — |
| Componentes | apps/app/app/components/team-dashboard/TeamDashboardStats.vue | formatDate |
| Páginas | apps/app/app/composables/.composition/layer-navigation.ts | — |
| Páginas | apps/app/app/composables/use-dashboard.ts | — |
| Páginas | apps/app/app/composables/use-notification.ts | ConfirmDialogOptions, ConfirmDialogRequest, useConfirmDialogState, useNotification |
| Páginas | apps/app/app/composables/use-trpc-client.ts | — |
| Páginas | apps/app/app/composables/useLayerNavigation.ts | useLayerNavigation |
| Páginas | apps/app/app/error.vue | — |
| Páginas | apps/app/app/layouts/dashboard.vue | — |
| Páginas | apps/app/app/layouts/page.vue | — |
| Páginas | apps/app/app/middleware/0.auth.global.ts | — |
| Páginas | apps/app/app/middleware/1.teams.global.ts | — |
| Páginas | apps/app/app/pages/account-settings/appearance.vue | — |
| Páginas | apps/app/app/pages/account-settings/index.vue | handleAvatarUpload, handleAvatarRemove, saveProfile, resetProfileForm |
| Páginas | apps/app/app/pages/account-settings/security.vue | of, goToChangePassword, onMfaEnrolled, onDisableMfa, onSignOutOthers, onDeleteAccount |
| Páginas | apps/app/app/pages/account-settings.vue | — |
| Páginas | apps/app/app/pages/[...path].vue | — |
| Páginas | apps/app/app/pages/[[team]]/dashboard.vue | — |
| Páginas | apps/app/app/plugins/authorization-resolver.ts | — |
| Páginas | apps/app/app/plugins/websockets.client.ts | — |
| Páginas | apps/app/app/utils/auth.ts | in |
| Páginas | apps/app/app/utils/date.ts | — |
| Páginas | apps/app/app/utils/plan-tier.ts | PLAN_TIER_COLORS |
| Páginas | apps/app/app/utils/team-status.ts | TEAM_STATUS_COLORS |
| Páginas | apps/app/app/utils/title-case.ts | toTitleCase |
| Páginas | apps/app/env.d.ts | H3EventContext |
| Páginas | apps/app/i18n/i18n.config.ts | — |
| Páginas | apps/app/nuxt.config.ts | — |
| Páginas | apps/app/public/crisp.js | — |
| Páginas | apps/app/public/static/crisp.js | — |
| Rotas e APIs | apps/app/server/api/auth/callback.ts | — |
| Rotas e APIs | apps/app/server/api/auth/session.delete.ts | — |
| Rotas e APIs | apps/app/server/api/auth/session.get.ts | — |
| Rotas e APIs | apps/app/server/api/auth/ws-ticket.get.ts | — |
| Rotas e APIs | apps/app/server/api/mfa/challenge.post.ts | — |
| Rotas e APIs | apps/app/server/api/mfa/setup.post.ts | — |
| Rotas e APIs | apps/app/server/api/mfa/status.get.ts | — |
| Rotas e APIs | apps/app/server/api/mfa/verify.post.ts | — |
| Rotas e APIs | apps/app/server/api/profile-pictures.get.ts | — |
| Rotas e APIs | apps/app/server/api/trpc/[trpc].ts | — |
| Rotas e APIs | apps/app/server/api/upload/profile-picture.ts | — |
| Páginas | apps/app/server/middleware/csp.ts | — |
| Páginas | apps/app/server/plugins/authorization-resolver.ts | — |
| Páginas | apps/app/server/plugins/database-binding.ts | called |
| Rotas e APIs | apps/app/server/trpc/context.ts | createContext |
| Rotas e APIs | apps/app/server/trpc/routers/.composition/layer-routers.ts | — |
| Rotas e APIs | apps/app/server/trpc/routers/account.ts | — |
| Rotas e APIs | apps/app/server/trpc/routers/index.ts | — |
| Rotas e APIs | apps/app/server/trpc/routers/public.ts | — |
| Rotas e APIs | apps/app/server/trpc/trpc.ts | allow, deny, auth |
| Páginas | apps/app/server/utils/audit-log.ts | AuditLogEntry, recordAuditLog |
| Páginas | apps/app/server/utils/auth.ts | getUser, getUserSession, getUserPermissions |
| Páginas | apps/app/server/utils/db.ts | setHyperdriveBinding, createDB, useDB, closeDB |
| Páginas | apps/app/server/utils/mfa-crypto.ts | toBase64, fromBase64, importAesKey, encryptSecret, decryptSecret |
| Páginas | apps/app/server/utils/rate-limit.ts | rateLimit, assertNotRateLimited |
| Páginas | apps/app/server/utils/user-mfa-session.ts | USER_MFA_COOKIE_NAME, USER_MFA_MAX_AGE_SECONDS, UserMfaSessionData, sessionConfig, getUserMfaSession, startUserMfaSession |
| Páginas | apps/app/server/utils/user-mfa.ts | getUserMfaRecord |
| Páginas | apps/app/server/utils/ws-ticket.ts | TICKET_TTL_MS, WsTicketUser, toBase64Url, hmacSign, createWsTicket |
| Páginas | apps/app/sst-env.d.ts | — |
| Páginas | apps/app/tailwind.config.ts | — |
| Páginas | apps/app/types/enums.ts | UserStatus, from |
| Páginas | apps/app/vitest.config.ts | Nuxt |
| Páginas | apps/app/vitest.setup.ts | — |
| Outras fontes | apps/functions/drizzle.config.ts | — |
| Outras fontes | apps/functions/src/auth.ts | sendVerificationCode, Env, secretsMatch, deleteIdentity, recognise, signOutOtherSessions, seedAccount, CREDENTIAL_ROUTES |
| Outras fontes | apps/functions/src/cron.ts | Environment |
| Outras fontes | apps/functions/src/database/core-schema.ts | this |
| Outras fontes | apps/functions/src/database/grant-platform-admin.ts | PLATFORM_ROLES, parseArgs, main |
| Outras fontes | apps/functions/src/database/schema.ts | — |
| Outras fontes | apps/functions/src/database/seed/data.ts | ACTIONS, FREE_PLAN, SYSTEM_ROLES |
| Outras fontes | apps/functions/src/database/seed/demo-accounts.ts | DEMO_TEAM_NAME, DEMO_TEAM_SLUG, parseArgs, seedIdentity, main, upsertUser |
| Outras fontes | apps/functions/src/database/seed/index.ts | main |
| Outras fontes | apps/functions/src/dlq-consumer.ts | Environment, FALLBACK_ERROR |
| Outras fontes | apps/functions/src/emails-types.ts | EmailsWorker |
| Outras fontes | apps/functions/src/emails.ts | Worker |
| Outras fontes | apps/functions/src/jobs-consumer.ts | Environment |
| Outras fontes | apps/functions/src/rate-limit.ts | rateLimit, clientIp |
| Outras fontes | apps/functions/src/sender.ts | — |
| Outras fontes | apps/functions/src/subjects.ts | — |
| Outras fontes | apps/functions/src/websockets.js | toBufferLike, isPlainObject, fromBase64Url, toBase64Url, hmacSign, verifyTicket, canSubscribeToTopic, Worker |
| Outras fontes | apps/functions/sst-env.d.ts | — |
| Páginas | apps/login/app/app.config.ts | — |
| Páginas | apps/login/app/app.vue | — |
| Componentes | apps/login/app/components/AuthAgreement.vue | — |
| Componentes | apps/login/app/components/AuthIcon.vue | — |
| Componentes | apps/login/app/components/AuthLayout.vue | — |
| Componentes | apps/login/app/components/AuthSocialLogin.vue | handleSocialSignIn |
| Páginas | apps/login/app/composables/useNotification.ts | useNotification |
| Páginas | apps/login/app/css/main.css | on, lands |
| Páginas | apps/login/app/pages/forgot-password.vue | ERROR_MESSAGES |
| Páginas | apps/login/app/pages/login.vue | ERROR_MESSAGES |
| Páginas | apps/login/app/pages/signup.vue | ERROR_MESSAGES |
| Outras fontes | apps/login/i18n/i18n.config.ts | — |
| Outras fontes | apps/login/nuxt.config.ts | of |
| Outras fontes | apps/login/sst-env.d.ts | — |
| Páginas | apps/web/app/app.config.ts | — |
| Páginas | apps/web/app/app.vue | — |
| Páginas | apps/web/app/assets/css/main.css | — |
| Componentes | apps/web/app/components/background/BackgroundDots.vue | — |
| Componentes | apps/web/app/components/color-mode/ColorModeDropdown.vue | — |
| Componentes | apps/web/app/components/color-mode/ColorModeSwitch.vue | — |
| Componentes | apps/web/app/components/content/Center.vue | — |
| Componentes | apps/web/app/components/content/CodeCopy.vue | handleCopy |
| Componentes | apps/web/app/components/content/ProseA.vue | — |
| Componentes | apps/web/app/components/content/ProseBlockquote.vue | — |
| Componentes | apps/web/app/components/content/ProseCode.vue | — |
| Componentes | apps/web/app/components/content/ProseCodeInline.vue | — |
| Componentes | apps/web/app/components/content/ProseEm.vue | — |
| Componentes | apps/web/app/components/content/ProseH1.vue | — |
| Componentes | apps/web/app/components/content/ProseH2.vue | — |
| Componentes | apps/web/app/components/content/ProseH3.vue | — |
| Componentes | apps/web/app/components/content/ProseH4.vue | — |
| Componentes | apps/web/app/components/content/ProseH5.vue | — |
| Componentes | apps/web/app/components/content/ProseH6.vue | — |
| Componentes | apps/web/app/components/content/ProseHr.vue | — |
| Componentes | apps/web/app/components/content/ProseImg.vue | — |
| Componentes | apps/web/app/components/content/ProseLi.vue | — |
| Componentes | apps/web/app/components/content/ProseOl.vue | — |
| Componentes | apps/web/app/components/content/ProseP.vue | — |
| Componentes | apps/web/app/components/content/ProsePre.vue | — |
| Componentes | apps/web/app/components/content/ProseStrong.vue | — |
| Componentes | apps/web/app/components/content/ProseTable.vue | — |
| Componentes | apps/web/app/components/content/ProseTbody.vue | — |
| Componentes | apps/web/app/components/content/ProseTd.vue | — |
| Componentes | apps/web/app/components/content/ProseTh.vue | — |
| Componentes | apps/web/app/components/content/ProseThead.vue | — |
| Componentes | apps/web/app/components/content/ProseTr.vue | — |
| Componentes | apps/web/app/components/content/ProseUl.vue | — |
| Componentes | apps/web/app/components/CTAButton.vue | Props |
| Componentes | apps/web/app/components/folder-tree/FolderTree.global.vue | — |
| Componentes | apps/web/app/components/folder-tree/FolderTreeItem.vue | FolderTreeItemProps, toggleExpand, getFileIcon |
| Componentes | apps/web/app/components/landing/LandingArchitecture.vue | — |
| Componentes | apps/web/app/components/landing/LandingAvatars.vue | — |
| Componentes | apps/web/app/components/landing/LandingComparisonTable.vue | FeatureItem, getCategoryItems, getCategoryCount |
| Componentes | apps/web/app/components/landing/LandingCTA.vue | — |
| Componentes | apps/web/app/components/landing/LandingDatabaseArchitecture.vue | getTablesList |
| Componentes | apps/web/app/components/landing/LandingFAQs.vue | — |
| Componentes | apps/web/app/components/landing/LandingFeatureBadges.vue | — |
| Componentes | apps/web/app/components/landing/LandingFeatureCard.vue | Subfeature |
| Componentes | apps/web/app/components/landing/LandingFeatures.vue | — |
| Componentes | apps/web/app/components/landing/LandingFolderStructure.vue | — |
| Componentes | apps/web/app/components/landing/LandingHero.vue | — |
| Componentes | apps/web/app/components/landing/LandingPageLogos.vue | — |
| Componentes | apps/web/app/components/landing/LandingPricing.vue | — |
| Componentes | apps/web/app/components/landing/LandingTestimonials.vue | Testimonial |
| Componentes | apps/web/app/components/landing/LandingUseCases.vue | EXAMPLE_SLOTS |
| Componentes | apps/web/app/components/layout/LayoutBanner.vue | — |
| Componentes | apps/web/app/components/layout/LayoutContentPage.vue | isBlogPost |
| Componentes | apps/web/app/components/layout/LayoutFooter.vue | — |
| Componentes | apps/web/app/components/layout/LayoutSection.vue | — |
| Componentes | apps/web/app/components/loader/LoaderSpin.vue | — |
| Componentes | apps/web/app/components/navigation/NavigationBar.vue | — |
| Componentes | apps/web/app/components/OgImage/NuxtSeo.satori.vue | — |
| Componentes | apps/web/app/components/pricing/PricingCard.vue | PricingFeature, Props |
| Componentes | apps/web/app/components/search/Search.vue | SearchProps |
| Componentes | apps/web/app/components/testimonial/TestimonialCard.vue | — |
| Componentes | apps/web/app/components/testimonial/TestimonialRow.vue | Testimonial |
| Páginas | apps/web/app/composables/use-breadcrumb.ts | BreadcrumbItem, useBreadcrumb |
| Páginas | apps/web/app/composables/use-collapsed-map.ts | useCollapsedMap |
| Páginas | apps/web/app/composables/use-content-navigation.ts | DocsNavBadge, DocsNavigationItem, findNavItemByPath |
| Páginas | apps/web/app/composables/use-docs-locale.ts | docsCollectionFor, queryDocsPage, queryDocsNavigation |
| Páginas | apps/web/app/composables/use-page.ts | — |
| Páginas | apps/web/app/composables/use-scrollspy.ts | useScrollspy |
| Páginas | apps/web/app/error.vue | — |
| Páginas | apps/web/app/layouts/default.vue | — |
| Páginas | apps/web/app/layouts/docs.vue | — |
| Páginas | apps/web/app/layouts/page.vue | — |
| Páginas | apps/web/app/pages/blog/index.vue | — |
| Páginas | apps/web/app/pages/blog/[...slug].vue | — |
| Páginas | apps/web/app/pages/index.vue | — |
| Páginas | apps/web/app/pages/license.vue | — |
| Páginas | apps/web/app/pages/privacy-policy.vue | — |
| Páginas | apps/web/app/pages/signup.vue | — |
| Páginas | apps/web/app/pages/terms-of-service.vue | — |
| Páginas | apps/web/app/utils/date.ts | — |
| Páginas | apps/web/app/utils/title-case.ts | toTitleCase |
| Outras fontes | apps/web/content.config.ts | — |
| Outras fontes | apps/web/i18n/i18n.config.ts | — |
| Outras fontes | apps/web/nuxt.config.ts | docsRoutes, walk, blogRoutes |
| Outras fontes | apps/web/public/crisp.js | — |
| Outras fontes | apps/web/sst-env.d.ts | — |
| Outras fontes | apps/web/tailwind.config.ts | — |
| Outras fontes | config.ts | — |
| Outras fontes | infra/app.ts | — |
| Outras fontes | infra/auth.ts | — |
| Outras fontes | infra/cron.ts | — |
| Outras fontes | infra/database.ts | — |
| Outras fontes | infra/dns.ts | — |
| Outras fontes | infra/emails.ts | EventEmitter |
| Outras fontes | infra/jobs.ts | — |
| Outras fontes | infra/secret.ts | — |
| Outras fontes | infra/utils/builder.ts | build |
| Outras fontes | infra/utils/constants.ts | COMPATIBILITY_DATE, COMPATIBILITY |
| Outras fontes | infra/utils/durable-objects.ts | that, provisioned, before, isDurableObjectClassProvisioned |
| Outras fontes | infra/utils/nuxt.ts | deployWorker |
| Outras fontes | infra/utils/semaphore.ts | Semaphore |
| Outras fontes | infra/web.ts | — |
| Outras fontes | infra/websockets.ts | is, has, doesn |
| Componentes | layers/admin/app/components/admin/AdminDataTable.vue | EDGE_GUTTER, unconditionally |
| Componentes | layers/admin/app/components/admin/companies/ReactivateModal.vue | confirm |
| Componentes | layers/admin/app/components/admin/companies/SuspendModal.vue | confirm |
| Componentes | layers/admin/app/components/admin/queue/ReplayModal.vue | ALREADY_REPLAYED, confirm |
| Páginas | layers/admin/app/layouts/admin.vue | onMfaVerified |
| Páginas | layers/admin/app/middleware/admin.ts | — |
| Páginas | layers/admin/app/pages/admin/audit-log.vue | UAvatar, UBadge, UButton, UTooltip, describeMetadata, sortableHeader |
| Páginas | layers/admin/app/pages/admin/companies/index.vue | UAvatar, UBadge, UButton, UCheckbox, UDropdownMenu, getRowItems, sortableHeader |
| Páginas | layers/admin/app/pages/admin/companies/[id].vue | — |
| Páginas | layers/admin/app/pages/admin/index.vue | UBadge, formatDate |
| Páginas | layers/admin/app/pages/admin/queue/index.vue | UBadge, UButton, UCheckbox, UDropdownMenu, UTooltip, refreshAll, JOB_STATUSES, describeMessage |
| Outras fontes | layers/admin/layer.manifest.ts | — |
| Outras fontes | layers/admin/nuxt.config.ts | — |
| Rotas e APIs | layers/admin/server/api/admin/mfa/challenge.post.ts | — |
| Rotas e APIs | layers/admin/server/api/admin/mfa/setup.post.ts | — |
| Rotas e APIs | layers/admin/server/api/admin/mfa/status.get.ts | — |
| Rotas e APIs | layers/admin/server/api/admin/mfa/verify.post.ts | — |
| Outras fontes | layers/admin/server/database/schema.ts | — |
| Rotas e APIs | layers/admin/server/trpc/admin-audit-log.ts | — |
| Rotas e APIs | layers/admin/server/trpc/admin-queue.ts | CRON_JOB_ID, readJobId |
| Rotas e APIs | layers/admin/server/trpc/admin-teams.ts | setTeamStatus |
| Rotas e APIs | layers/admin/server/trpc/router.ts | — |
| Outras fontes | layers/admin/server/utils/platform-admin.ts | findActivePlatformAdmin, rather, isActivePlatformAdmin |
| Outras fontes | layers/admin/server/utils/platform-mfa-session.ts | PLATFORM_MFA_COOKIE_NAME, PLATFORM_MFA_MAX_AGE_SECONDS, PlatformMfaSessionData, sessionConfig, getPlatformMfaSession, startPlatformMfaSession |
| Outras fontes | layers/admin/sst-env.d.ts | — |
| Componentes | layers/billing/app/components/admin/plans/CreateEditModal.vue | CustomFeature, toProviderOption, addFeature, removeFeature, reset, onSubmit |
| Componentes | layers/billing/app/components/billing/BillingComparisonTable.vue | PlanItem, Props, StoredFeature, getPlanFeatureValue |
| Componentes | layers/billing/app/components/billing/BillingPeriodToggle.vue | PeriodOption |
| Componentes | layers/billing/app/components/billing/BillingPortalActions.vue | PortalLinksObj, Props |
| Componentes | layers/billing/app/components/billing/BillingTrialBanner.vue | Props, formatDate |
| Componentes | layers/billing/app/components/pricing/PricingCard.vue | PricingFeature, Props |
| Páginas | layers/billing/app/composables/use-ability.ts | — |
| Páginas | layers/billing/app/composables/use-payments.ts | PaymentItem, PaddlePayments, StripePayments, usePayments, Paddle, init, checkoutPaddle, checkoutStripe |
| Páginas | layers/billing/app/pages/admin/plans/index.vue | UBadge, UButton, UCheckbox, UDropdownMenu, edit, setArchived, setupStripePortal, getRowItems |
| Páginas | layers/billing/app/pages/[[team]]/settings/billing.vue | openCheckout |
| Outras fontes | layers/billing/layer.manifest.ts | — |
| Outras fontes | layers/billing/nuxt.config.ts | — |
| Rotas e APIs | layers/billing/server/api/webhooks/paddle.post.ts | dispatch, mapPaddleStatus |
<!-- specsfy:documentator:end -->
