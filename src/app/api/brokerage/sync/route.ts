import { NextResponse } from "next/server";
import type { Account, Balance, UniversalActivity } from "snaptrade-typescript-sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isNerdPlan } from "@/lib/billing/plan";
import { getSnapTrade } from "@/lib/snaptrade/client";

const PAGE_SIZE = 1000;
const DEFAULT_ACTIVITY_START_DATE = "2000-01-01";

interface ActivityPage {
  data?: UniversalActivity[];
  pagination?: {
    total?: number;
  };
}

function accountDisplayName(account: Account): string | null {
  return account.name || account.number || account.institution_name || null;
}

function activityKey(activity: UniversalActivity): string {
  if (activity.id) return activity.id;
  if (activity.external_reference_id) return activity.external_reference_id;

  return [
    activity.type ?? "UNKNOWN",
    activity.trade_date ?? "",
    activity.settlement_date ?? "",
    activity.amount ?? "",
    activity.units ?? "",
    activity.description ?? "",
  ].join("|");
}

async function listAllActivities(params: {
  accountId: string;
  startDate: string;
  endDate: string;
  userId: string;
  userSecret: string;
}): Promise<UniversalActivity[]> {
  const snaptrade = getSnapTrade();
  const activities: UniversalActivity[] = [];
  let offset = 0;
  let total: number | null = null;

  do {
    const res = await snaptrade.accountInformation.getAccountActivities({
      accountId: params.accountId,
      userId: params.userId,
      userSecret: params.userSecret,
      startDate: params.startDate,
      endDate: params.endDate,
      offset,
      limit: PAGE_SIZE,
    });

    const body = res.data as ActivityPage | UniversalActivity[];
    const page = Array.isArray(body) ? body : body.data ?? [];
    activities.push(...page);
    total =
      !Array.isArray(body) && typeof body.pagination?.total === "number"
        ? body.pagination.total
        : total;
    offset += page.length;

    if (page.length === 0) break;
  } while (total == null ? activities.length % PAGE_SIZE === 0 : offset < total);

  return activities;
}

function balanceRow(params: {
  userId: string;
  account: Account;
  balance: Balance;
  syncedAt: string;
}) {
  const currencyCode = params.balance.currency?.code ?? "UNKNOWN";

  return {
    user_id: params.userId,
    broker: "snaptrade",
    broker_account_id: params.account.id,
    account_name: accountDisplayName(params.account),
    institution_name: params.account.institution_name,
    currency_code: currencyCode,
    cash: params.balance.cash ?? null,
    buying_power: params.balance.buying_power ?? null,
    raw: params.balance,
    synced_at: params.syncedAt,
  };
}

function activityRow(params: {
  userId: string;
  account: Account;
  activity: UniversalActivity;
  syncedAt: string;
}) {
  const symbol =
    params.activity.symbol?.raw_symbol ?? params.activity.symbol?.symbol ?? null;

  return {
    user_id: params.userId,
    broker: "snaptrade",
    broker_account_id: params.account.id,
    account_name: accountDisplayName(params.account),
    institution_name: params.account.institution_name,
    activity_key: activityKey(params.activity),
    snaptrade_activity_id: params.activity.id ?? null,
    external_reference_id: params.activity.external_reference_id ?? null,
    type: params.activity.type ?? null,
    option_type: params.activity.option_type ?? null,
    symbol,
    option_symbol: params.activity.option_symbol?.ticker ?? null,
    description: params.activity.description ?? null,
    trade_date: params.activity.trade_date ?? null,
    settlement_date: params.activity.settlement_date ?? null,
    amount: params.activity.amount ?? null,
    units: params.activity.units ?? null,
    price: params.activity.price ?? null,
    fee: params.activity.fee ?? null,
    currency_code: params.activity.currency?.code ?? null,
    raw: params.activity,
    synced_at: params.syncedAt,
  };
}

/**
 * POST /api/brokerage/sync
 * Syncs SnapTrade account activities and cash balances for every connected account.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await isNerdPlan(user.id))) {
      return NextResponse.json(
        { error: "Brokerage sync requires the Nerd plan", upgrade: true },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { data: snaptradeUser } = await admin
      .from("snaptrade_users")
      .select("snaptrade_user_id, user_secret")
      .eq("user_id", user.id)
      .single();

    if (!snaptradeUser) {
      return NextResponse.json(
        { error: "No SnapTrade broker connection found" },
        { status: 409 },
      );
    }

    const snaptrade = getSnapTrade();
    const accountsRes = await snaptrade.accountInformation.listUserAccounts({
      userId: snaptradeUser.snaptrade_user_id,
      userSecret: snaptradeUser.user_secret,
    });
    const accounts = accountsRes.data ?? [];
    const syncedAt = new Date().toISOString();

    const accountSyncs = await Promise.all(
      accounts.map(async (account) => {
        const startDate = DEFAULT_ACTIVITY_START_DATE;
        const endDate = new Date().toISOString().slice(0, 10);
        const [balancesRes, activities] = await Promise.all([
          snaptrade.accountInformation.getUserAccountBalance({
            accountId: account.id,
            userId: snaptradeUser.snaptrade_user_id,
            userSecret: snaptradeUser.user_secret,
          }),
          listAllActivities({
            accountId: account.id,
            startDate,
            endDate,
            userId: snaptradeUser.snaptrade_user_id,
            userSecret: snaptradeUser.user_secret,
          }),
        ]);

        return {
          account,
          activityStartDate: startDate,
          activityEndDate: endDate,
          balances: balancesRes.data ?? [],
          activities,
        };
      }),
    );

    const accountIds = accounts.map((account) => account.id);
    const balanceRows = accountSyncs.flatMap(({ account, balances }) =>
      balances.map((balance) =>
        balanceRow({ userId: user.id, account, balance, syncedAt }),
      ),
    );
    const activityRows = accountSyncs.flatMap(({ account, activities }) =>
      activities.map((activity) =>
        activityRow({ userId: user.id, account, activity, syncedAt }),
      ),
    );
    if (accountIds.length > 0) {
      const { error: deleteBalancesError } = await admin
        .from("brokerage_cash_balances")
        .delete()
        .eq("user_id", user.id)
        .eq("broker", "snaptrade")
        .in("broker_account_id", accountIds);

      if (deleteBalancesError) {
        throw new Error(deleteBalancesError.message);
      }
    }

    if (balanceRows.length > 0) {
      const { error: balanceError } = await admin
        .from("brokerage_cash_balances")
        .insert(balanceRows);

      if (balanceError) {
        throw new Error(balanceError.message);
      }
    }

    if (activityRows.length > 0) {
      const { error: activityError } = await admin
        .from("brokerage_activities")
        .upsert(activityRows, {
          onConflict: "user_id,broker,broker_account_id,activity_key",
        });

      if (activityError) {
        throw new Error(activityError.message);
      }
    }

    return NextResponse.json({
      accounts: accountSyncs.length,
      balances: balanceRows.length,
      activities: activityRows.length,
      activityWindows: accountSyncs.map((sync) => ({
        accountId: sync.account.id,
        accountName: accountDisplayName(sync.account),
        institutionName: sync.account.institution_name,
        startDate: sync.activityStartDate,
        endDate: sync.activityEndDate,
        activities: sync.activities.length,
        transactionSync: sync.account.sync_status?.transactions ?? null,
        holdingsSync: sync.account.sync_status?.holdings ?? null,
      })),
      syncedAt,
    });
  } catch (err) {
    console.error("SnapTrade activity/balance sync failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Brokerage sync failed" },
      { status: 500 },
    );
  }
}
