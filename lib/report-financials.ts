import { centsToCurrency } from '@/lib/payment-query';

export const REPORT_ACCOUNTING_POLICY =
  'Gross collections include every original payment amount; refunded amount includes refunded records; net revenue equals paid records (gross collections minus refunded amount).';

export function mongoCurrencyToCents(field: string) {
  return { $round: [{ $multiply: [field, 100] }, 0] };
}

export function reportCurrency(cents: number | null | undefined): number {
  return centsToCurrency(cents ?? 0);
}

export interface PaymentCentSummary {
  grossCents?: number;
  refundedCents?: number;
  netCents?: number;
  paymentCount?: number;
  paidCount?: number;
  refundedCount?: number;
}

export function paymentSummaryFromCents(summary: PaymentCentSummary | undefined) {
  return {
    grossPaid: reportCurrency(summary?.grossCents),
    refundedAmount: reportCurrency(summary?.refundedCents),
    netRevenue: reportCurrency(summary?.netCents),
    paymentCount: summary?.paymentCount ?? 0,
    paidCount: summary?.paidCount ?? 0,
    refundedCount: summary?.refundedCount ?? 0,
    accountingPolicy: REPORT_ACCOUNTING_POLICY,
  };
}
