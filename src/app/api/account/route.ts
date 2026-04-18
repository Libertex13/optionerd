import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STRIPE_SECRET_KEY } from "@/lib/stripe/config";

/**
 * DELETE /api/account
 *
 * Deletes the authenticated user's account:
 * 1. Cancels any active Stripe subscription
 * 2. Deletes the Supabase auth user (cascades to profiles + saved_trades)
 *
 * Body: { reason?: string; feedback?: string }
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse optional feedback
  let reason = "";
  let feedback = "";
  try {
    const body = await request.json();
    reason = body.reason ?? "";
    feedback = body.feedback ?? "";
  } catch {
    // No body is fine
  }

  const admin = createAdminClient();

  // Get profile to check for Stripe customer
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, plan")
    .eq("id", user.id)
    .single();

  // Cancel Stripe subscription if they're a paying customer
  if (profile?.stripe_customer_id && STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY);

      // List active subscriptions and cancel them all
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: "active",
      });

      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id);
      }

      // Also cancel any trialing subscriptions
      const trialingSubs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: "trialing",
      });

      for (const sub of trialingSubs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    } catch (err) {
      console.error("Failed to cancel Stripe subscriptions:", err);
      // Continue with deletion even if Stripe cancellation fails
    }
  }

  // Log the feedback (you could store this in a table later)
  if (reason || feedback) {
    console.log(
      `Account deletion feedback — user: ${user.id}, email: ${user.email}, reason: ${reason}, feedback: ${feedback}`,
    );

    // Store feedback in a simple table if it exists, otherwise just log
    await admin
      .from("account_deletion_feedback")
      .insert({
        user_email: user.email,
        reason,
        feedback,
      })
      .then(({ error }) => {
        if (error) {
          // Table might not exist yet — that's fine, we logged it
          console.log("Could not store deletion feedback (table may not exist):", error.message);
        }
      });
  }

  // Delete the auth user — cascades to profiles and saved_trades
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }

  return NextResponse.json({ deleted: true });
}
