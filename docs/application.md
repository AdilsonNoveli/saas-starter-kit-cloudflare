# Aplicação e implementações

<!-- specsfy:documentator:start -->
## Surfaces

Categories: Services, Routes and APIs, Pages, Components, Tests, and Other sources.

Inventory: maps each observed file to its surface.

| Category | File | Symbols |
| --- | --- | --- |
| Pages | apps/app/app/app.config.ts | — |
| Pages | apps/app/app/app.vue | — |
| Pages | apps/app/app/assets/css/main.css | — |
| Components | apps/app/app/components/account/AccountUserDropdown.vue | — |
| Components | apps/app/app/components/account/MfaRecoveryCodes.vue | download |
| Components | apps/app/app/components/account/MfaRecoveryPanel.vue | loadRemaining, onSubmit |
| Components | apps/app/app/components/account/MfaSetupModal.vue | startSetup, onSubmit, finishEnrolment, onRecoverySubmit, notifyFailure |
| Components | apps/app/app/components/avatar/AvatarUploader.vue | triggerUpload, onFileChange |
| Components | apps/app/app/components/background/BackgroundDots.vue | — |
| Components | apps/app/app/components/ConfirmDialog.vue | settle |
| Components | apps/app/app/components/layout/LayoutContentPage.vue | — |
| Components | apps/app/app/components/layout/LayoutSection.vue | — |
| Components | apps/app/app/components/loader/LoaderSpin.vue | — |
| Components | apps/app/app/components/settings/SettingsPanel.vue | — |
| Components | apps/app/app/components/team-dashboard/TeamDashboardActivity.vue | UAvatar, UBadge |
| Components | apps/app/app/components/team-dashboard/TeamDashboardChart.client.vue | — |
| Components | apps/app/app/components/team-dashboard/TeamDashboardChart.server.vue | — |
| Components | apps/app/app/components/team-dashboard/TeamDashboardStats.vue | formatDate |
| Pages | apps/app/app/composables/.composition/layer-navigation.ts | — |
| Pages | apps/app/app/composables/use-dashboard.ts | — |
| Pages | apps/app/app/composables/use-notification.ts | ConfirmDialogOptions, ConfirmDialogRequest, useConfirmDialogState, useNotification |
| Pages | apps/app/app/composables/use-trpc-client.ts | — |
| Pages | apps/app/app/composables/useLayerNavigation.ts | useLayerNavigation, useLayerTeamSettingsTabs |
| Pages | apps/app/app/error.vue | — |
| Pages | apps/app/app/layouts/dashboard.vue | — |
| Pages | apps/app/app/layouts/page.vue | — |
| Pages | apps/app/app/middleware/0.auth.global.ts | — |
| Pages | apps/app/app/middleware/1.teams.global.ts | — |
| Pages | apps/app/app/middleware/2.onboarding.global.ts | — |
| Pages | apps/app/app/pages/account-settings/appearance.vue | — |
| Pages | apps/app/app/pages/account-settings/index.vue | handleAvatarUpload, handleAvatarRemove, saveProfile, resetProfileForm |
| Pages | apps/app/app/pages/account-settings/security.vue | of, goToChangePassword, onMfaEnrolled, onDisableMfa, onSignOutOthers, onDeleteAccount |
| Pages | apps/app/app/pages/account-settings.vue | — |
| Pages | apps/app/app/pages/buy/[planId].vue | startCheckout |
| Pages | apps/app/app/pages/claim/[id].vue | onNameInput, destinationParams, claim |
| Pages | apps/app/app/pages/[...path].vue | — |
| Pages | apps/app/app/pages/[[team]]/dashboard.vue | — |
| Pages | apps/app/app/plugins/authorization-resolver.ts | — |
| Pages | apps/app/app/plugins/websockets.client.ts | — |
| Pages | apps/app/app/utils/auth.ts | in |
| Pages | apps/app/app/utils/date.ts | — |
| Pages | apps/app/app/utils/plan-tier.ts | PLAN_TIER_COLORS |
| Pages | apps/app/app/utils/team-status.ts | TEAM_STATUS_COLORS |
| Pages | apps/app/app/utils/title-case.ts | toTitleCase |
| Pages | apps/app/env.d.ts | H3EventContext |
| Pages | apps/app/i18n/i18n.config.ts | — |
| Pages | apps/app/nuxt.config.ts | — |
| Pages | apps/app/public/crisp.js | — |
| Pages | apps/app/public/static/crisp.js | — |
| Routes and APIs | apps/app/server/api/auth/callback.ts | PREFERENCE_COOKIE_MAX_AGE_SECONDS |
| Routes and APIs | apps/app/server/api/auth/session.delete.ts | — |
| Routes and APIs | apps/app/server/api/auth/session.get.ts | — |
| Routes and APIs | apps/app/server/api/auth/ws-ticket.get.ts | — |
| Routes and APIs | apps/app/server/api/mfa/challenge.post.ts | — |
| Routes and APIs | apps/app/server/api/mfa/recovery-codes.post.ts | — |
| Routes and APIs | apps/app/server/api/mfa/setup.post.ts | — |
| Routes and APIs | apps/app/server/api/mfa/status.get.ts | — |
| Routes and APIs | apps/app/server/api/mfa/verify.post.ts | — |
| Routes and APIs | apps/app/server/api/profile-pictures.get.ts | — |
| Routes and APIs | apps/app/server/api/trpc/[trpc].ts | — |
| Routes and APIs | apps/app/server/api/upload/profile-picture.ts | — |
| Pages | apps/app/server/middleware/csp.ts | — |
| Pages | apps/app/server/plugins/authorization-resolver.ts | — |
| Pages | apps/app/server/plugins/database-binding.ts | called |
| Routes and APIs | apps/app/server/trpc/context.ts | createContext |
| Routes and APIs | apps/app/server/trpc/routers/.composition/layer-routers.ts | — |
| Routes and APIs | apps/app/server/trpc/routers/account.ts | — |
| Routes and APIs | apps/app/server/trpc/routers/admin-teams-billing.ts | buildAdminTeamsRouterWithBilling |
| Routes and APIs | apps/app/server/trpc/routers/index.ts | buildAdminRouterWithBilling |
| Routes and APIs | apps/app/server/trpc/routers/public.ts | — |
| Routes and APIs | apps/app/server/trpc/trpc.ts | is, allow, deny, auth |
| Pages | apps/app/server/utils/audit-log.ts | AuditLogEntry, recordAuditLog |
| Pages | apps/app/server/utils/auth.test.ts | IMPORT_TIMEOUT, ACCESS_COOKIE, REFRESH_COOKIE, requestEvent, properties, clearedCookieNames, fakeDatabase |
| Pages | apps/app/server/utils/auth.ts | SESSION_COOKIE_MAX_AGE_SECONDS, getUser, getUserSession, getUserPermissions |
| Pages | apps/app/server/utils/db.ts | setHyperdriveBinding, createDB, useDB, closeDB |
| Pages | apps/app/server/utils/mfa-crypto.ts | toBase64, fromBase64, importAesKey, encryptSecret, decryptSecret |
| Pages | apps/app/server/utils/mfa-recovery.test.ts | KEY |
| Pages | apps/app/server/utils/mfa-recovery.ts | RECOVERY_CODE_COUNT, ALPHABET, CODE_LENGTH, generateRecoveryCode, formatRecoveryCode, normalizeRecoveryCode, hashRecoveryCode, replaceRecoveryCodes |
| Pages | apps/app/server/utils/preference-cookies.test.ts | IMPORT_TIMEOUT |
| Pages | apps/app/server/utils/preference-cookies.ts | preferenceCookies |
| Pages | apps/app/server/utils/rate-limit.test.ts | WINDOW_START, stubHubKv |
| Pages | apps/app/server/utils/rate-limit.ts | rateLimit, assertNotRateLimited |
| Pages | apps/app/server/utils/user-mfa-session.ts | USER_MFA_COOKIE_NAME, USER_MFA_MAX_AGE_SECONDS, UserMfaSessionData, sessionConfig, getUserMfaSession, startUserMfaSession |
| Pages | apps/app/server/utils/user-mfa.ts | getUserMfaRecord, isValidUserTotp |
| Pages | apps/app/server/utils/ws-ticket.ts | TICKET_TTL_MS, WsTicketUser, toBase64Url, hmacSign, createWsTicket |
| Pages | apps/app/shared/utils/error-message.test.ts | — |
| Pages | apps/app/shared/utils/error-message.ts | getErrorMessage |
| Pages | apps/app/sst-env.d.ts | — |
| Pages | apps/app/tailwind.config.ts | — |
| Pages | apps/app/types/enums.ts | UserStatus, from |
| Pages | apps/app/vitest.config.ts | Nuxt |
| Pages | apps/app/vitest.setup.ts | — |
| Other sources | apps/functions/drizzle.config.ts | — |
| Other sources | apps/functions/src/auth.ts | sendVerificationCode, Env, refuseInternalCall, deleteIdentity, revokeIdentitySessions, readIdentityState, changeIdentityEmail, seedAccount |
| Tests | apps/functions/src/credential-rate-limit.test.ts | WINDOW_START, fakeAuthKv, envWith, credentialPost |
| Tests | apps/functions/src/cron.test.ts | DAY, NOW, fakeDb, applyWhere, rowsAtTheBoundary |
| Other sources | apps/functions/src/cron.ts | Environment, SESSION_RETENTION_DAYS, DAY_MS, purgeExpiredSessions |
| Other sources | apps/functions/src/database/core-schema.ts | this |
| Other sources | apps/functions/src/database/grant-platform-admin.ts | PLATFORM_ROLES, parseArgs, main |
| Other sources | apps/functions/src/database/reset-mfa.ts | SCOPES, parseArgs, main |
| Other sources | apps/functions/src/database/schema.ts | — |
| Other sources | apps/functions/src/database/seed/data.ts | ACTIONS, FREE_PLAN, SYSTEM_ROLES |
| Other sources | apps/functions/src/database/seed/demo-accounts.ts | DEMO_TEAM_NAME, DEMO_TEAM_SLUG, parseArgs, seedIdentity, main, upsertUser |
| Other sources | apps/functions/src/database/seed/index.ts | main |
| Tests | apps/functions/src/database/with-db.test.ts | — |
| Other sources | apps/functions/src/database/with-db.ts | withDb |
| Other sources | apps/functions/src/dlq-consumer.ts | Environment, FALLBACK_ERROR |
| Other sources | apps/functions/src/emails-types.ts | EmailsWorker |
| Other sources | apps/functions/src/emails.ts | Env, Worker |
| Tests | apps/functions/src/identity-email.test.ts | ADMIN_SECRET, FLOW_TIMEOUT, MINUTE, OLD, NEW, putProfile, putSession, seedAna |
| Tests | apps/functions/src/identity-state.test.ts | ADMIN_SECRET, IMPORT_TIMEOUT, putSession, seedAna, callState |
| Tests | apps/functions/src/issuer-sessions.test.ts | FLOW_TIMEOUT, MINUTE, sidOf, nowSeconds, renew, authWorker |
| Other sources | apps/functions/src/jobs-consumer.ts | Environment |
| Other sources | apps/functions/src/rate-limit.ts | rateLimit, clientIp |
| Other sources | apps/functions/src/sender.ts | — |
| Tests | apps/functions/src/session-store.test.ts | ADMIN_SECRET, IMPORT_TIMEOUT, FLOW_TIMEOUT, SessionProperties, refreshRecord, putSession, keysUnder, sessionKeysOf |
| Other sources | apps/functions/src/session-store.ts | stableSubject, sessionRecords, revokeSessions, SessionResponder, normalizeEmail, issueUserSession, rememberPasswordSubject, ownProfile |
| Other sources | apps/functions/src/subjects.ts | — |
| Other sources | apps/functions/src/test-support/issuer-harness.ts | ISSUER_URL, CLIENT_ID, REDIRECT_URI, TestPerson, TokenPair, RefreshRecord, FlowTarget, createFlows |
| Other sources | apps/functions/src/websockets.js | toBufferLike, isPlainObject, canSubscribeToTopic, Worker, getAttachedState, Websockets |
| Other sources | apps/functions/sst-env.d.ts | — |
| Other sources | apps/functions/vitest.config.ts | — |
| Pages | apps/login/app/app.config.ts | — |
| Pages | apps/login/app/app.vue | — |
| Components | apps/login/app/components/AuthAgreement.vue | — |
| Components | apps/login/app/components/AuthLayout.vue | — |
| Components | apps/login/app/components/AuthSocialLogin.vue | handleSocialSignIn |
| Pages | apps/login/app/composables/useNotification.ts | useNotification |
| Pages | apps/login/app/css/main.css | on, lands |
| Pages | apps/login/app/pages/forgot-password.vue | ERROR_MESSAGES |
| Pages | apps/login/app/pages/login.vue | ERROR_MESSAGES |
| Pages | apps/login/app/pages/signup.vue | ERROR_MESSAGES |
| Other sources | apps/login/i18n/i18n.config.ts | — |
| Other sources | apps/login/nuxt.config.ts | of |
| Other sources | apps/login/sst-env.d.ts | — |
| Pages | apps/web/app/app.config.ts | — |
| Pages | apps/web/app/app.vue | — |
| Pages | apps/web/app/assets/css/main.css | — |
| Components | apps/web/app/components/background/BackgroundDots.vue | — |
| Components | apps/web/app/components/color-mode/ColorModeSwitch.vue | — |
| Components | apps/web/app/components/content/Center.vue | — |
| Components | apps/web/app/components/content/CodeCopy.vue | handleCopy |
| Components | apps/web/app/components/content/ProseA.vue | — |
| Components | apps/web/app/components/content/ProseBlockquote.vue | — |
| Components | apps/web/app/components/content/ProseCode.vue | — |
| Components | apps/web/app/components/content/ProseCodeInline.vue | — |
| Components | apps/web/app/components/content/ProseEm.vue | — |
| Components | apps/web/app/components/content/ProseH1.vue | — |
| Components | apps/web/app/components/content/ProseH2.vue | — |
| Components | apps/web/app/components/content/ProseH3.vue | — |
| Components | apps/web/app/components/content/ProseH4.vue | — |
| Components | apps/web/app/components/content/ProseH5.vue | — |
| Components | apps/web/app/components/content/ProseH6.vue | — |
| Components | apps/web/app/components/content/ProseHr.vue | — |
| Components | apps/web/app/components/content/ProseImg.vue | — |
| Components | apps/web/app/components/content/ProseLi.vue | — |
| Components | apps/web/app/components/content/ProseOl.vue | — |
| Components | apps/web/app/components/content/ProseP.vue | — |
| Components | apps/web/app/components/content/ProsePre.vue | — |
| Components | apps/web/app/components/content/ProseStrong.vue | — |
| Components | apps/web/app/components/content/ProseTable.vue | — |
| Components | apps/web/app/components/content/ProseTbody.vue | — |
| Components | apps/web/app/components/content/ProseTd.vue | — |
| Components | apps/web/app/components/content/ProseTh.vue | — |
| Components | apps/web/app/components/content/ProseThead.vue | — |
| Components | apps/web/app/components/content/ProseTr.vue | — |
| Components | apps/web/app/components/content/ProseUl.vue | — |
| Components | apps/web/app/components/CTAButton.vue | Props |
| Components | apps/web/app/components/folder-tree/FolderTree.global.vue | — |
| Components | apps/web/app/components/folder-tree/FolderTreeItem.vue | FolderTreeNode, FolderTreeItemProps, toggleExpand, getFileIcon |
| Components | apps/web/app/components/landing/LandingAudience.vue | — |
| Components | apps/web/app/components/landing/LandingHero.vue | — |
| Components | apps/web/app/components/landing/LandingMethod.vue | — |
| Components | apps/web/app/components/landing/LandingOffer.vue | — |
| Components | apps/web/app/components/landing/LandingOutcomes.vue | — |
| Components | apps/web/app/components/landing/LandingProblem.vue | — |
| Components | apps/web/app/components/landing/LandingProof.vue | — |
| Components | apps/web/app/components/layout/LayoutContentPage.vue | isBlogPost |
| Components | apps/web/app/components/layout/LayoutFooter.vue | — |
| Components | apps/web/app/components/layout/LayoutSection.vue | — |
| Components | apps/web/app/components/loader/LoaderSpin.vue | — |
| Components | apps/web/app/components/navigation/NavigationBar.vue | — |
| Components | apps/web/app/components/search/Search.vue | SearchProps |
| Components | apps/web/app/components/testimonial/TestimonialCard.vue | — |
| Components | apps/web/app/components/testimonial/TestimonialRow.vue | Testimonial |
| Pages | apps/web/app/composables/use-breadcrumb.ts | useBreadcrumb |
| Pages | apps/web/app/composables/use-collapsed-map.ts | useCollapsedMap |
| Pages | apps/web/app/composables/use-content-navigation.ts | DocsNavBadge, DocsNavigationItem, findNavItemByPath |
| Pages | apps/web/app/composables/use-content-seo.ts | useSeoContext, useDefaultSocialMeta, useArticleSeo, usePageSeo |
| Pages | apps/web/app/composables/use-docs-locale.ts | docsCollectionFor, queryDocsPage, queryDocsNavigation |
| Pages | apps/web/app/composables/use-notification.ts | useNotification |
| Pages | apps/web/app/composables/use-offer.ts | LAUNCH_OPEN, INTL, PublicOfferPlan, useOffer |
| Pages | apps/web/app/composables/use-page.ts | — |
| Pages | apps/web/app/composables/use-scrollspy.ts | useScrollspy |
| Pages | apps/web/app/error.vue | — |
| Pages | apps/web/app/layouts/default.vue | — |
| Pages | apps/web/app/layouts/docs.vue | — |
| Pages | apps/web/app/layouts/page.vue | — |
| Pages | apps/web/app/pages/blog/index.vue | — |
| Pages | apps/web/app/pages/blog/[...slug].vue | — |
| Pages | apps/web/app/pages/index.vue | — |
| Pages | apps/web/app/pages/license.vue | — |
| Pages | apps/web/app/pages/privacy-policy.vue | — |
| Pages | apps/web/app/pages/signup.vue | — |
| Pages | apps/web/app/pages/terms-of-service.vue | — |
| Pages | apps/web/app/utils/blog-locale.test.ts | GIT |
| Pages | apps/web/app/utils/blog-locale.ts | BlogListEntry, clusterKey, postsForLocale |
| Pages | apps/web/app/utils/breadcrumb.test.ts | — |
| Pages | apps/web/app/utils/breadcrumb.ts | BreadcrumbNavItem, BreadcrumbItem, breadcrumbFromNavigation |
| Pages | apps/web/app/utils/date.test.ts | — |
| Pages | apps/web/app/utils/date.ts | — |
| Pages | apps/web/app/utils/landing-contract.test.ts | WEB, LOCALES, flatten, FORBIDDEN, docExists |
| Pages | apps/web/app/utils/offer.test.ts | OFFER |
| Pages | apps/web/app/utils/offer.ts | Offer, OFFER, validateOffer, activePrice, formatPrice, whatsappUrl, offerSchema |
| Pages | apps/web/app/utils/seo/content-seo.test.ts | — |
| Pages | apps/web/app/utils/seo/content-seo.ts | OG_IMAGE_SIZE, BLOG_BASE, SeoContext, BlogPostInput, AlternateLink, SocialImage, SeoMeta, BlogPostingSchema |
| Pages | apps/web/app/utils/title-case.ts | toTitleCase |
| Other sources | apps/web/content.config.ts | — |
| Other sources | apps/web/i18n/i18n.config.ts | — |
| Other sources | apps/web/i18n/supported-locales.ts | CONTENT_LOCALES, CONTENT_LANGS |
| Other sources | apps/web/nuxt.config.ts | docsRoutes, walk, blogRoutes |
| Other sources | apps/web/public/crisp.js | — |
| Routes and APIs | apps/web/server/api/offer.get.ts | PublicOfferPlan |
| Other sources | apps/web/server/plugins/sitemap-blog.ts | to |
| Other sources | apps/web/site.ts | SITE_URL, DEFAULT_OG_IMAGE |
| Other sources | apps/web/sst-env.d.ts | — |
| Other sources | apps/web/tailwind.config.ts | — |
| Other sources | config.ts | ACCESS_TOKEN_TTL_SECONDS |
| Other sources | infra/app.ts | — |
| Other sources | infra/auth.ts | — |
| Other sources | infra/branding.ts | — |
| Other sources | infra/cron.ts | — |
| Other sources | infra/database.ts | — |
| Other sources | infra/dns.ts | — |
| Other sources | infra/emails.ts | EventEmitter |
| Other sources | infra/jobs.ts | — |
| Other sources | infra/secret.ts | — |
| Other sources | infra/utils/builder.ts | build |
| Other sources | infra/utils/constants.ts | COMPATIBILITY_DATE, COMPATIBILITY |
| Other sources | infra/utils/durable-objects.ts | that, is, isDurableObjectClassProvisioned |
| Other sources | infra/utils/nuxt.ts | deployWorker |
| Other sources | infra/utils/semaphore.ts | Semaphore |
| Other sources | infra/web.ts | — |
| Other sources | infra/websockets.ts | — |
| Components | layers/account/app/components/account/AccountEmailChange.vue | codeOf, textOf, focusById, focusFirstError, CODE_ERRORS, open, cancel, requestCodes |
| Components | layers/account/app/components/account/AccountHeaderActions.vue | trpcCode, save |
| Components | layers/account/app/components/account/AccountPreferencesForm.vue | shows, set, instead, localized, EXAMPLES, onSubmit |
| Components | layers/account/app/components/account/AccountSessionsList.vue | MOBILE_SYSTEMS, browserOf, systemOf, deviceOf, iconOf, countryName, placeOf, isoOf |
| Components | layers/account/app/components/account/AccountUserDropdown.vue | — |
| Components | layers/account/app/components/account/MfaRecoveryCodes.vue | download |
<!-- specsfy:documentator:end -->

## Notes

- Account, profile and user MFA moved from `apps/app` to `layers/account` (SPEC-0009); its layout and conventions are in `layers/account/README.md`. The security primitives live in `packages/crypto` and `packages/rate-limit` (`.fireskills/STACK.md`).
- What exists in the code, and the pending `apps/web` rate-limiting content that still describes the old location, is recorded in `.fireskills/PROJECT.md`.
