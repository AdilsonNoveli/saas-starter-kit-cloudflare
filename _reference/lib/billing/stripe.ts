import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { SubscriptionTier, BillingFrequency } from '@prisma/client';
import { STRIPE_PRICES } from './constants';

// Lazy-initialize Stripe client to avoid build-time errors
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

// For backwards compatibility
export const stripe = {
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
  get coupons() { return getStripe().coupons; },
  get webhooks() { return getStripe().webhooks; },
};

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  });

  // Save customer ID to subscription
  await prisma.subscription.update({
    where: { userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Get Stripe price ID for a tier and frequency
 */
export function getStripePriceId(
  tier: Exclude<SubscriptionTier, 'FREE'>,
  frequency: BillingFrequency
): string {
  return STRIPE_PRICES[tier][frequency].priceId;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  name: string | undefined,
  tier: Exclude<SubscriptionTier, 'FREE'>,
  frequency: BillingFrequency,
  successUrl: string,
  cancelUrl: string,
  promotionCode?: string
): Promise<Stripe.Checkout.Session> {
  const customerId = await getOrCreateStripeCustomer(userId, email, name);
  const priceId = getStripePriceId(tier, frequency);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tier,
      frequency,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
        frequency,
      },
    },
  };

  // Apply promotion code if provided
  if (promotionCode) {
    // Look up the promotion in our database
    const promotion = await prisma.promotion.findUnique({
      where: { code: promotionCode.toUpperCase() },
      select: { stripeCouponId: true },
    });

    if (promotion?.stripeCouponId) {
      sessionParams.discounts = [{ coupon: promotion.stripeCouponId }];
    }
  } else {
    // Allow customers to enter a coupon code in Stripe Checkout
    // Note: can't use both discounts and allow_promotion_codes
    sessionParams.allow_promotion_codes = true;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

/**
 * Create a Stripe Billing Portal session
 */
export async function createBillingPortalSession(
  userId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    throw new Error('No Stripe customer found for this user');
  }

  return stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });
}

/**
 * Cancel a Stripe subscription
 */
export async function cancelStripeSubscription(
  stripeSubscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return stripe.subscriptions.cancel(stripeSubscriptionId);
  }

  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume a canceled subscription (before period end)
 */
export async function resumeStripeSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Update subscription to a different plan
 */
export async function updateStripeSubscription(
  stripeSubscriptionId: string,
  tier: Exclude<SubscriptionTier, 'FREE'>,
  frequency: BillingFrequency
): Promise<Stripe.Subscription> {
  const priceId = getStripePriceId(tier, frequency);

  // Get current subscription to find the subscription item
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const subscriptionItemId = subscription.items.data[0].id;

  return stripe.subscriptions.update(stripeSubscriptionId, {
    items: [
      {
        id: subscriptionItemId,
        price: priceId,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: {
      tier,
      frequency,
    },
  });
}

/**
 * Create a Stripe coupon for a promotion
 */
export async function createStripeCoupon(
  promotionId: string,
  discountPercent: number,
  durationInMonths?: number
): Promise<Stripe.Coupon> {
  const couponParams: Stripe.CouponCreateParams = {
    percent_off: discountPercent,
    metadata: {
      promotionId,
    },
  };

  if (durationInMonths) {
    couponParams.duration = 'repeating';
    couponParams.duration_in_months = durationInMonths;
  } else {
    couponParams.duration = 'forever';
  }

  return stripe.coupons.create(couponParams);
}

/**
 * Verify Stripe webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
