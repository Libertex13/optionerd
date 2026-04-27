import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/supabase/types";

export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read profile plan: ${error.message}`);
  }

  return data?.plan === "nerd" ? "nerd" : "casual";
}

export async function isNerdPlan(userId: string): Promise<boolean> {
  return (await getUserPlan(userId)) === "nerd";
}
