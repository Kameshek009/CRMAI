import { createClient } from "@supabase/supabase-js";
import { stripe, createCustomer } from "./server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// Get or Create Stripe Customer
// ============================================================================

export interface CustomerInfo {
  accountId: string;
  clerkUserId: string;
  email: string;
  name?: string;
  teamId?: string;
  existingStripeCustomerId?: string | null;
}

/**
 * Get or create a Stripe customer for a team.
 * Stores stripe_customer_id on both account and team.
 */
export async function getOrCreateStripeCustomer(
  info: CustomerInfo
): Promise<string> {
  const { accountId, clerkUserId, email, name, teamId, existingStripeCustomerId } = info;

  if (existingStripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingStripeCustomerId);
      if (!customer.deleted) {
        return existingStripeCustomerId;
      }
    } catch {
      console.log(`Customer ${existingStripeCustomerId} not found, creating new one`);
    }
  }

  const customer = await createCustomer({
    email,
    name,
    accountId,
    clerkUserId,
    teamId,
  });

  // Store on account
  await supabase
    .from("accounts")
    .update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  // Store on team
  if (teamId) {
    await supabase
      .from("teams")
      .update({ stripe_customer_id: customer.id })
      .eq("id", teamId);
  }

  return customer.id;
}

// ============================================================================
// Customer Billing Info
// ============================================================================

export interface PaymentMethodInfo {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelAt: Date | null;
  priceId: string;
  productName: string | null;
  quantity: number;
}

export interface InvoiceInfo {
  id: string;
  number: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: Date;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
}

export interface CustomerBillingInfo {
  customerId: string;
  email: string;
  name: string | null;
  created: Date;
  paymentMethods: PaymentMethodInfo[];
  subscription: SubscriptionInfo | null;
  invoices: InvoiceInfo[];
  balance: number;
}

export async function getCustomerBillingInfo(
  customerId: string
): Promise<CustomerBillingInfo | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });

    if (customer.deleted) {
      return null;
    }

    const paymentMethodsResponse = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    const defaultPaymentMethodId =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id;

    const paymentMethods: PaymentMethodInfo[] = paymentMethodsResponse.data.map(
      (pm) => ({
        id: pm.id,
        brand: pm.card?.brand || "unknown",
        last4: pm.card?.last4 || "****",
        expMonth: pm.card?.exp_month || 0,
        expYear: pm.card?.exp_year || 0,
        isDefault: pm.id === defaultPaymentMethodId,
      })
    );

    const subscriptionsResponse = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    let subscription: SubscriptionInfo | null = null;
    const firstSubscription = subscriptionsResponse.data[0];
    if (firstSubscription) {
      const sub = firstSubscription as any;
      const priceId = sub.items?.data?.[0]?.price?.id || "";
      const quantity = sub.items?.data?.[0]?.quantity || 1;

      subscription = {
        id: sub.id,
        status: sub.status,
        currentPeriodStart: new Date((sub.current_period_start || 0) * 1000),
        currentPeriodEnd: new Date((sub.current_period_end || 0) * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end || false,
        cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
        priceId,
        productName: null,
        quantity,
      };
    }

    const invoicesResponse = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
    });

    const invoices: InvoiceInfo[] = invoicesResponse.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status || "unknown",
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      created: new Date(inv.created * 1000),
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      pdfUrl: inv.invoice_pdf ?? null,
    }));

    return {
      customerId,
      email: customer.email || "",
      name: customer.name || null,
      created: new Date(customer.created * 1000),
      paymentMethods,
      subscription,
      invoices,
      balance: customer.balance || 0,
    };
  } catch (error) {
    console.error("Error fetching customer billing info:", error);
    return null;
  }
}

export async function syncCustomerFromClerk(
  customerId: string,
  email: string,
  name?: string
): Promise<void> {
  await stripe.customers.update(customerId, {
    email,
    name: name || undefined,
  });
}
