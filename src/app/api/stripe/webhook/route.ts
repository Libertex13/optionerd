import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/config";

function getStripe() {
  return new Stripe(STRIPE_SECRET_KEY);
}

/**
 * Helper: update a profile by stripe_customer_id.
 * Returns true on success.
 */
async function updateProfileByCustomer(
  supabase: ReturnType<typeof createAdminClient>,
  customerId: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error(`Failed to update profile for customer ${customerId}:`, error);
    return false;
  }
  return true;
}

/**
 * Helper: sync subscription state → profile plan fields.
 */
function planFromSubscription(subscription: Stripe.Subscription) {
  const status = subscription.status;
  const isActive = status === "active" || status === "trialing";
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  const planPeriod = interval === "year" ? "yearly" : "monthly";
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

  return {
    plan: isActive ? "nerd" : "casual",
    plan_period: isActive ? planPeriod : null,
    plan_expires_at: currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null,
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    // ─── Checkout ───────────────────────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = session.customer as string;

      if (!userId) {
        console.error("checkout.session.completed: no client_reference_id");
        break;
      }

      // Determine period from the subscription
      let planPeriod: "monthly" | "yearly" = "monthly";
      let planExpiresAt: string | null = null;
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        const interval = subscription.items.data[0]?.price?.recurring?.interval;
        if (interval === "year") planPeriod = "yearly";
        const periodEnd = subscription.items.data[0]?.current_period_end;
        if (periodEnd) planExpiresAt = new Date(periodEnd * 1000).toISOString();
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          plan: "nerd",
          stripe_customer_id: customerId,
          plan_period: planPeriod,
          plan_expires_at: planExpiresAt,
        })
        .eq("id", userId);

      if (error) {
        console.error("Failed to update profile on checkout:", error);
      } else {
        console.log(`Upgraded user ${userId} to nerd (${planPeriod})`);
      }
      break;
    }

    // ─── Subscription lifecycle ─────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.resumed": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const fields = planFromSubscription(subscription);

      if (await updateProfileByCustomer(supabase, customerId, fields)) {
        console.log(`Subscription ${event.type}: customer ${customerId} → ${fields.plan}`);
      }
      break;
    }

    case "customer.subscription.deleted":
    case "customer.subscription.paused": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      if (
        await updateProfileByCustomer(supabase, customerId, {
          plan: "casual",
          plan_period: null,
          plan_expires_at: null,
        })
      ) {
        console.log(`Subscription ${event.type}: customer ${customerId} → casual`);
      }
      break;
    }

    // ─── Payment events ─────────────────────────────────────────
    case "invoice.paid": {
      // Successful renewal — ensure plan is active
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : null;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const fields = planFromSubscription(subscription);
        if (await updateProfileByCustomer(supabase, customerId, fields)) {
          console.log(`Invoice paid: customer ${customerId} renewed → ${fields.plan}`);
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      // Payment failed — log it. Stripe will retry automatically.
      // After all retries fail, subscription.deleted fires and we downgrade.
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      console.warn(
        `Invoice payment failed for customer ${customerId}, attempt ${invoice.attempt_count}`,
      );
      break;
    }

    // ─── Customer events ────────────────────────────────────────
    case "customer.deleted": {
      // Customer deleted in Stripe — clear the link and downgrade
      const customer = event.data.object as Stripe.Customer;

      const { error } = await supabase
        .from("profiles")
        .update({
          plan: "casual",
          stripe_customer_id: null,
          plan_period: null,
          plan_expires_at: null,
        })
        .eq("stripe_customer_id", customer.id);

      if (error) {
        console.error(`Failed to handle customer.deleted for ${customer.id}:`, error);
      } else {
        console.log(`Customer ${customer.id} deleted → profile reset to casual`);
      }
      break;
    }

    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}
