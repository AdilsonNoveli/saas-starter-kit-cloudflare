import type { Environments, Paddle } from "@paddle/paddle-js";

export interface PaymentItem {
  priceId: string;
  quantity?: number;
}

interface PaddlePayments {
  init: () => Promise<Paddle>;
  checkout: (
    items: PaymentItem[],
    options?: { discountCode?: string; theme?: "light" | "dark"; data?: Record<string, unknown> },
  ) => Promise<void>;
}

interface StripePayments {
  init: () => Promise<null>;
  checkout: (priceId: string, teamId: string) => Promise<string>;
}

// Overloaded on the literal provider so callers get back the shape for the
// provider they actually asked for, instead of a union of both providers'
// (incompatible) `checkout` signatures — that union is what made every real
// call site a type error regardless of which provider it targeted.
export function usePayments(provider: "PADDLE"): PaddlePayments | undefined;
export function usePayments(provider: "STRIPE"): StripePayments | undefined;
export function usePayments(provider: string) {
  if (provider === "PADDLE") {
    const colorMode = useColorMode();
    const Paddle = ref<Paddle | null>(null);
    const { paddleClientToken, paddleEnvironment } = useRuntimeConfig().public;
    // Anything other than an explicit "production" stays on sandbox: an
    // environment that forgot to set the variable must not end up talking to
    // live Paddle just because the string didn't match.
    const environment: Environments =
      paddleEnvironment === "production" ? "production" : "sandbox";

    async function init() {
      if (Paddle.value) return Paddle.value;
      if (!paddleClientToken) {
        throw new Error(
          "Paddle is not configured: NUXT_PUBLIC_PADDLE_CLIENT_TOKEN is empty",
        );
      }
      const { onLoaded } = useScript(
        "https://cdn.paddle.com/paddle/v2/paddle.js",
        {
          trigger: "onNuxtReady",
          use() {
            return window.Paddle;
          },
        },
      );
      return new Promise<Paddle>((resolve, reject) => {
        onLoaded((p) => {
          try {
            p.Environment.set(environment);
            p.Initialize({
              token: paddleClientToken,
            });
            Paddle.value = p;
            resolve(p);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    async function checkoutPaddle(
      items: PaymentItem[],
      options: {
        discountCode?: string;
        theme?: "light" | "dark";
        data?: Record<string, unknown>;
      } = {},
    ) {
      if (!Paddle.value) {
        await init();
      }
      if (!Paddle.value) {
        throw new Error("Payment provider could not be initialized");
      }
      Paddle.value.Checkout.open({
        settings: {
          theme:
            options.theme ?? (colorMode.value === "dark" ? "dark" : "light"),
          variant: "one-page",
        },
        items: items.map((item) => ({
          priceId: item.priceId,
          quantity: item.quantity ?? 1,
        })),
        customData: options?.data || undefined,
        discountCode: options.discountCode,
      });
    }
    return {
      init,
      checkout: checkoutPaddle,
    };
  } else if (provider === "STRIPE") {
    async function init() {
      return null;
    }

    async function checkoutStripe(priceId: string, teamId: string) {
      const redirectUrl = window.location.pathname;
      const sessionUrl =
        await useTrpcClient().stripe.createStripeCheckoutSession.mutate({
          priceId,
          teamId,
          redirectUrl,
        });

      if (!sessionUrl) {
        throw new Error("Failed to create Stripe checkout session");
      }
      return sessionUrl.url;
    }

    return {
      init,
      checkout: checkoutStripe,
    };
  }
}
