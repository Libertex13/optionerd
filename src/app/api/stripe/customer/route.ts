import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STRIPE_SECRET_KEY } from "@/lib/stripe/config";

function getStripe() {
  return new Stripe(STRIPE_SECRET_KEY);
}

/**
 * POST /api/stripe/customer
 *
 * Creates a Stripe customer for the authenticated user if one doesn't
 * already exist. Called automatically after sign-in/sign-up.
 */
export async function POST() {
  // Bail out if Stripe isn't configured yet
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ skipped: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if this user already has a Stripe customer
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, email, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_customer_id) {
    return NextResponse.json({ customer_id: profile.stripe_customer_id });
  }

  // Create the Stripe customer
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email ?? profile?.email,
    name: profile?.display_name ?? undefined,
    metadata: {
      supabase_user_id: user.id,
    },
  });

  // Store the customer ID in the profile
  const { error } = await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to save stripe_customer_id:", error);
    return NextResponse.json(
      { error: "Failed to link customer" },
      { status: 500 },
    );
  }

  return NextResponse.json({ customer_id: customer.id }, { status: 201 });
}
