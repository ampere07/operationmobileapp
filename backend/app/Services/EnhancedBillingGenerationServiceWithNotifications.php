<?php

namespace App\Services;

use App\Models\BillingAccount;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\StatementOfAccount;
use App\Models\AppPlan;
use App\Models\Discount;
use App\Models\StaggeredInstallation;
use App\Models\AdvancedPayment;
use App\Models\MassRebate;
use App\Models\RebateUsage;
use App\Models\Barangay;
use App\Models\BillingConfig;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class EnhancedBillingGenerationServiceWithNotifications
{
    protected BillingNotificationService $notificationService;
    protected const VAT_RATE = 0.12;
    protected const DAYS_IN_MONTH = 30;
    protected const DAYS_UNTIL_DUE = 7;
    protected const DAYS_UNTIL_DC_NOTICE = 4;
    protected const END_OF_MONTH_BILLING = 0;

    public function __construct(BillingNotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }
    
    protected function log($level, $message, $context = [])
    {
        Log::channel('billing')->{$level}($message, $context);
    }

    public function generateSOAForBillingDay(int $billingDay, Carbon $generationDate, int $userId): array
    {
        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => [],
            'statements' => [],
            'notifications' => []
        ];

        try {
            $accounts = $this->getActiveAccountsForBillingDay($billingDay, $generationDate);

            foreach ($accounts as $account) {
                try {
                    $statement = $this->createEnhancedStatement($account, $generationDate, $userId);
                    $results['statements'][] = $statement;
                    $results['success']++;
                    
                    $notificationResult = $this->queueNotification($account, null, $statement);
                    $results['notifications'][] = $notificationResult;
                    
                } catch (\Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'account_id' => $account->id,
                        'account_no' => $account->account_no,
                        'error' => $e->getMessage()
                    ];
                    $this->log('error', "Failed to generate SOA for account {$account->account_no}: " . $e->getMessage());
                }
            }

            return $results;
        } catch (\Exception $e) {
            $this->log('error', "Error in generateSOAForBillingDay: " . $e->getMessage());
            throw $e;
        }
    }

    public function generateInvoicesForBillingDay(int $billingDay, Carbon $generationDate, int $userId): array
    {
        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => [],
            'invoices' => [],
            'notifications' => []
        ];

        try {
            $accounts = $this->getActiveAccountsForBillingDay($billingDay, $generationDate);

            foreach ($accounts as $account) {
                try {
                    $invoice = $this->createEnhancedInvoice($account, $generationDate, $userId);
                    $results['invoices'][] = $invoice;
                    $results['success']++;
                    
                    $notificationResult = $this->queueNotification($account, $invoice, null);
                    $results['notifications'][] = $notificationResult;
                    
                } catch (\Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'account_id' => $account->id,
                        'account_no' => $account->account_no,
                        'error' => $e->getMessage()
                    ];
                    $this->log('error', "Failed to generate invoice for account {$account->account_no}: " . $e->getMessage());
                }
            }

            return $results;
        } catch (\Exception $e) {
            $this->log('error', "Error in generateInvoicesForBillingDay: " . $e->getMessage());
            throw $e;
        }
    }

    protected function queueNotification(
        BillingAccount $account,
        ?Invoice $invoice,
        ?StatementOfAccount $soa
    ): array {
        try {
            dispatch(function() use ($account, $invoice, $soa) {
                $this->notificationService->notifyBillingGenerated(
                    $account,
                    $invoice,
                    $soa
                );
            })->afterResponse();
            
            $this->log('info', 'Notification queued', [
                'account_no' => $account->account_no,
                'has_invoice' => $invoice !== null,
                'has_soa' => $soa !== null
            ]);
            
            return [
                'account_no' => $account->account_no,
                'queued' => true
            ];
        } catch (\Exception $e) {
            $this->log('error', 'Failed to queue notification', [
                'account_no' => $account->account_no,
                'error' => $e->getMessage()
            ]);
            
            return [
                'account_no' => $account->account_no,
                'queued' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    protected function getActiveAccountsForBillingDay(int $billingDay, Carbon $generationDate)
    {
        $targetDay = $this->adjustBillingDayForMonth($billingDay, $generationDate);

        $query = BillingAccount::with([
            'customer',
            'technicalDetails',
            'plan'
        ])
            ->where('billing_status_id', 2)
            ->whereNotNull('date_installed')
            ->whereNotNull('account_no');

        if ($billingDay === self::END_OF_MONTH_BILLING) {
            $query->where('billing_day', self::END_OF_MONTH_BILLING);
        } else {
            $query->where('billing_day', $targetDay);
        }

        $accounts = $query->get();

        $this->log('info', 'Loaded accounts with complete data', [
            'billing_day' => $billingDay,
            'generation_date' => $generationDate->format('Y-m-d'),
            'accounts_count' => $accounts->count()
        ]);

        return $accounts;
    }

    protected function adjustBillingDayForMonth(int $billingDay, Carbon $date): int
    {
        if ($billingDay === self::END_OF_MONTH_BILLING) {
            return self::END_OF_MONTH_BILLING;
        }

        if ($date->format('M') === 'Feb') {
            if ($billingDay === 29) {
                return 1;
            } elseif ($billingDay === 30) {
                return 2;
            } elseif ($billingDay === 31) {
                return 3;
            }
        }
        return $billingDay;
    }

    public function createEnhancedStatement(BillingAccount $account, Carbon $statementDate, int $userId): StatementOfAccount
    {
        DB::beginTransaction();

        try {
            $customer = $account->customer;
            if (!$customer) {
                throw new \Exception("Customer not found for account {$account->account_no}");
            }

            $desiredPlan = $customer->desired_plan;
            if (!$desiredPlan) {
                throw new \Exception("No desired_plan found for customer {$customer->full_name}");
            }

            $planName = $this->extractPlanName($desiredPlan);
            
            $plan = AppPlan::where('plan_name', $planName)->first();
                
            if (!$plan) {
                $allPlans = AppPlan::select('id', 'plan_name', 'price')->get();
                throw new \Exception("Plan '{$planName}' not found in plan_list table (extracted from '{$desiredPlan}'). Available plans: " . $allPlans->pluck('plan_name')->implode(', '));
            }

            if (!$plan->price || $plan->price <= 0) {
                throw new \Exception("Plan '{$planName}' has invalid price: " . ($plan->price ?? 'NULL'));
            }

            $adjustedDate = $this->calculateAdjustedBillingDate($account, $statementDate);
            $dueDate = $adjustedDate->copy()->addDays(self::DAYS_UNTIL_DUE);

            $prorateAmount = $this->calculateProrateAmount($account, $plan->price, $adjustedDate);
            $monthlyFeeGross = $prorateAmount / (1 + self::VAT_RATE);
            $vat = $monthlyFeeGross * self::VAT_RATE;
            $monthlyServiceFee = $prorateAmount - $vat;

            $invoiceId = $this->generateInvoiceId($statementDate);
            
            $charges = $this->calculateChargesAndDeductions(
                $account, 
                $statementDate, 
                $userId, 
                $invoiceId,
                $plan->price,
                false,
                false
            );
            
            $othersAndBasicCharges = 0;

            $amountDue = $monthlyServiceFee + $vat + $charges['staggered_install_fees'] + $charges['service_fees'] - $charges['rebates'] - $charges['discounts'] - $charges['advanced_payments'];
            
            $previousBalance = $this->getPreviousBalance($account, $statementDate);
            $paymentReceived = $charges['payment_received_previous'];
            $remainingBalance = $previousBalance - $paymentReceived;
            $totalAmountDue = $remainingBalance + $amountDue;

            $statement = StatementOfAccount::create([
                'account_no' => $account->account_no,
                'statement_date' => $statementDate,
                'balance_from_previous_bill' => round($previousBalance, 2),
                'payment_received_previous' => round($paymentReceived, 2),
                'remaining_balance_previous' => round($remainingBalance, 2),
                'monthly_service_fee' => round($monthlyServiceFee, 2),
                'others_and_basic_charges' => round($othersAndBasicCharges, 2),
                'service_charge' => round($charges['service_fees'], 2),
                'rebate' => round($charges['rebates'], 2),
                'discounts' => round($charges['discounts'], 2),
                'staggered' => round($charges['staggered_install_fees'], 2),
                'vat' => round($vat, 2),
                'due_date' => $dueDate,
                'amount_due' => round($amountDue, 2),
                'total_amount_due' => round($totalAmountDue, 2),
                'print_link' => null,
                'created_by' => (string) $userId,
                'updated_by' => (string) $userId
            ]);

            DB::commit();
            
            $this->log('info', 'SOA created successfully', [
                'account_no' => $account->account_no,
                'statement_id' => $statement->id,
                'total_amount_due' => $statement->total_amount_due
            ]);
            
            return $statement;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function createEnhancedInvoice(BillingAccount $account, Carbon $invoiceDate, int $userId): Invoice
    {
        DB::beginTransaction();

        try {
            $customer = $account->customer;
            if (!$customer) {
                throw new \Exception("Customer not found for account {$account->account_no}");
            }

            $desiredPlan = $customer->desired_plan;
            if (!$desiredPlan) {
                throw new \Exception("No desired_plan found for customer {$customer->full_name}");
            }

            $planName = $this->extractPlanName($desiredPlan);
            
            $plan = AppPlan::where('plan_name', $planName)->first();
            if (!$plan) {
                throw new \Exception("Plan '{$planName}' not found in plan_list table (extracted from '{$desiredPlan}')");
            }

            if (!$plan->price || $plan->price <= 0) {
                throw new \Exception("Plan '{$planName}' has invalid price: " . ($plan->price ?? 'NULL'));
            }

            $adjustedDate = $this->calculateAdjustedBillingDate($account, $invoiceDate);
            $dueDate = $adjustedDate->copy()->addDays(self::DAYS_UNTIL_DUE);

            $invoiceId = $this->generateInvoiceId($invoiceDate);
            
            $prorateAmount = $this->calculateProrateAmount($account, $plan->price, $adjustedDate);
            $charges = $this->calculateChargesAndDeductions(
                $account, 
                $invoiceDate, 
                $userId, 
                $invoiceId,
                $plan->price,
                true,
                true
            );
            
            $othersBasicCharges = 0;

            $totalAmount = $prorateAmount + $charges['staggered_install_fees'] + $charges['service_fees'] - $charges['rebates'] - $charges['discounts'] - $charges['advanced_payments'];
            
            if ($account->account_balance < 0) {
                $totalAmount += $account->account_balance;
            }

            $invoice = Invoice::create([
                'account_no' => $account->account_no,
                'invoice_date' => $invoiceDate,
                'invoice_balance' => round($prorateAmount, 2),
                'others_and_basic_charges' => round($othersBasicCharges, 2),
                'service_charge' => round($charges['service_fees'], 2),
                'rebate' => round($charges['rebates'], 2),
                'discounts' => round($charges['discounts'], 2),
                'staggered' => round($charges['staggered_install_fees'], 2),
                'total_amount' => round($totalAmount, 2),
                'received_payment' => 0.00,
                'due_date' => $dueDate,
                'status' => $totalAmount <= 0 ? 'Paid' : 'Unpaid',
                'payment_portal_log_ref' => null,
                'transaction_id' => null,
                'created_by' => (string) $userId,
                'updated_by' => (string) $userId
            ]);

            $appliedDiscounts = $charges['discounts'];
            
            $newBalance = $account->account_balance > 0 
                ? $totalAmount + $account->account_balance 
                : $totalAmount;

            $account->update([
                'account_balance' => round($newBalance, 2),
                'balance_update_date' => $invoiceDate
            ]);
            
            $this->log('info', 'Invoice created with discount applied to balance', [
                'account_no' => $account->account_no,
                'invoice_balance' => $prorateAmount,
                'total_amount' => $totalAmount,
                'discounts_applied' => $appliedDiscounts,
                'previous_balance' => $account->account_balance,
                'new_balance' => $newBalance
            ]);
            
            $this->markDiscountsAsUsed($account, $userId, $invoiceId);
            $this->markRebatesAsUsed($account, $userId, $invoiceId);
            $this->trackStaggeredInvoiceAssociation($account->account_no, $invoice->id);

            DB::commit();
            
            $this->log('info', 'Invoice created successfully', [
                'account_no' => $account->account_no,
                'invoice_id' => $invoice->id,
                'total_amount' => $invoice->total_amount
            ]);
            
            return $invoice;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
    
    protected function generateInvoiceId(Carbon $date): string
    {
        $year = $date->format('y');
        $month = $date->format('m');
        $day = $date->format('d');
        $hour = $date->format('H');
        $randomId = '0000';
        
        return $year . $month . $day . $hour . $randomId;
    }

    protected function calculateAdjustedBillingDate(BillingAccount $account, Carbon $baseDate): Carbon
    {
        if ($account->billing_day === self::END_OF_MONTH_BILLING) {
            return $baseDate->copy()->endOfMonth();
        }

        if ($account->billing_day != 30) {
            $daysRemaining = 30 - $account->billing_day;
            return $baseDate->copy()->addDays($daysRemaining);
        }
        
        return $baseDate->copy();
    }

    protected function calculateProrateAmount(BillingAccount $account, float $monthlyFee, Carbon $currentDate): float
    {
        // Always return the fixed monthly plan price (No Prorating)
        return $monthlyFee;
    }

    protected function getDaysBetweenDatesIncludingDueDate(Carbon $startDate, Carbon $endDate): int
    {
        $endDateWithBuffer = $endDate->copy()->addDays(self::DAYS_UNTIL_DUE);
        return $startDate->diffInDays($endDateWithBuffer) + 1;
    }

    protected function getAdvanceGenerationDay(): int
    {
        $billingConfig = BillingConfig::first();
        
        if (!$billingConfig || $billingConfig->advance_generation_day === null) {
            $this->log('info', 'No advance_generation_day configured, using default 0');
            return 0;
        }
        
        return $billingConfig->advance_generation_day;
    }

    protected function calculateTargetBillingDays(Carbon $generationDate): array
    {
        $advanceGenerationDay = $this->getAdvanceGenerationDay();
        $currentDay = $generationDate->day;
        $targetBillingDay = $currentDay + $advanceGenerationDay;
        
        $billingDays = [];
        
        if ($generationDate->isLastOfMonth()) {
            $billingDays[] = self::END_OF_MONTH_BILLING;
            
            $lastDayOfMonth = $generationDate->day;
            $targetDay = $lastDayOfMonth + $advanceGenerationDay;
            
            if ($targetDay <= 31) {
                $billingDays[] = $targetDay;
            }
        } else {
            if ($targetBillingDay <= 31) {
                $billingDays[] = $targetBillingDay;
            }
            
            $lastDayOfMonth = $generationDate->copy()->endOfMonth()->day;
            if ($targetBillingDay > $lastDayOfMonth) {
                $billingDays[] = self::END_OF_MONTH_BILLING;
            }
        }
        
        $this->log('info', 'Calculated target billing days', [
            'generation_date' => $generationDate->format('Y-m-d'),
            'current_day' => $currentDay,
            'advance_generation_day' => $advanceGenerationDay,
            'target_billing_day' => $targetBillingDay,
            'billing_days_to_process' => $billingDays
        ]);
        
        return $billingDays;
    }

    public function generateAllBillingsForToday(int $userId): array
    {
        $today = Carbon::now();
        $targetBillingDays = $this->calculateTargetBillingDays($today);
        $advanceGenerationDay = $this->getAdvanceGenerationDay();

        $results = [
            'date' => $today->format('Y-m-d'),
            'advance_generation_day' => $advanceGenerationDay,
            'billing_days_processed' => [],
            'invoices' => ['success' => 0, 'failed' => 0, 'errors' => [], 'notifications' => []],
            'statements' => ['success' => 0, 'failed' => 0, 'errors' => [], 'notifications' => []]
        ];

        foreach ($targetBillingDays as $billingDay) {
            $billingDayLabel = $billingDay === self::END_OF_MONTH_BILLING ? 'End of Month (0)' : "Day {$billingDay}";
            
            $this->log('info', "Processing billing day: {$billingDayLabel}");
            
            $soaResults = $this->generateSOAForBillingDay($billingDay, $today, $userId);
            $invoiceResults = $this->generateInvoicesForBillingDay($billingDay, $today, $userId);
            
            $results['billing_days_processed'][] = $billingDayLabel;
            $results['invoices']['success'] += $invoiceResults['success'];
            $results['invoices']['failed'] += $invoiceResults['failed'];
            $results['invoices']['errors'] = array_merge($results['invoices']['errors'], $invoiceResults['errors']);
            $results['invoices']['notifications'] = array_merge($results['invoices']['notifications'], $invoiceResults['notifications'] ?? []);
            
            $results['statements']['success'] += $soaResults['success'];
            $results['statements']['failed'] += $soaResults['failed'];
            $results['statements']['errors'] = array_merge($results['statements']['errors'], $soaResults['errors']);
            $results['statements']['notifications'] = array_merge($results['statements']['notifications'], $soaResults['notifications'] ?? []);
        }

        return $results;
    }

    public function generateBillingsForSpecificDay(int $billingDay, int $userId): array
    {
        $today = Carbon::now();

        $soaResults = $this->generateSOAForBillingDay($billingDay, $today, $userId);
        $invoiceResults = $this->generateInvoicesForBillingDay($billingDay, $today, $userId);

        return [
            'date' => $today->format('Y-m-d'),
            'billing_day' => $billingDay === self::END_OF_MONTH_BILLING ? 'End of Month (0)' : $billingDay,
            'invoices' => $invoiceResults,
            'statements' => $soaResults
        ];
    }

    protected function calculateChargesAndDeductions(
        BillingAccount $account, 
        Carbon $date, 
        int $userId, 
        string $invoiceId,
        float $monthlyFee,
        bool $updateDiscountStatus = false,
        bool $includeDiscounts = true
    ): array {
        $staggeredInstallFees = $this->calculateStaggeredInstallFees($account, $userId, $invoiceId, $updateDiscountStatus);
        $discounts = $includeDiscounts ? $this->calculateDiscounts($account, $userId, $invoiceId, $updateDiscountStatus) : 0;
        $advancedPayments = $this->calculateAdvancedPayments($account, $date, $userId, $invoiceId);
        $rebates = $this->calculateRebates($account, $date, $monthlyFee);
        $serviceFees = $this->calculateServiceFees($account, $date, $userId);
        $paymentReceived = $this->calculatePaymentReceived($account, $date);

        return [
            'staggered_install_fees' => $staggeredInstallFees,
            'discounts' => $discounts,
            'advanced_payments' => $advancedPayments,
            'rebates' => $rebates,
            'service_fees' => $serviceFees,
            'total_deductions' => $advancedPayments + $discounts + $rebates,
            'payment_received_previous' => $paymentReceived
        ];
    }

    protected function calculateStaggeredInstallFees(BillingAccount $account, int $userId, string $invoiceId, bool $updateStatus = false): float
    {
        $total = 0;

        $staggeredInstallations = StaggeredInstallation::where('account_no', $account->account_no)
            ->where('status', 'Active')
            ->where('months_to_pay', '>', 0)
            ->get();

        foreach ($staggeredInstallations as $installation) {
            $total += $installation->monthly_payment;
        }

        return round($total, 2);
    }

    protected function calculateDiscounts(BillingAccount $account, int $userId, string $invoiceId, bool $updateStatus = false): float
    {
        $total = 0;

        $discounts = Discount::where('account_no', $account->account_no)
            ->whereIn('status', ['Unused', 'Permanent', 'Monthly'])
            ->get();

        foreach ($discounts as $discount) {
            if ($discount->status === 'Unused') {
                $total += $discount->discount_amount;
            } elseif ($discount->status === 'Permanent') {
                $total += $discount->discount_amount;
            } elseif ($discount->status === 'Monthly' && $discount->remaining > 0) {
                $total += $discount->discount_amount;
            }
        }

        return round($total, 2);
    }

    protected function calculateAdvancedPayments(
        BillingAccount $account, 
        Carbon $date, 
        int $userId, 
        string $invoiceId
    ): float {
        $total = 0;
        $currentMonth = $date->format('F');

        $advancedPayments = AdvancedPayment::where('account_no', $account->account_no)
            ->where('payment_month', $currentMonth)
            ->where('status', 'Unused')
            ->get();

        foreach ($advancedPayments as $payment) {
            $total += $payment->payment_amount;
            $payment->update([
                'status' => 'Used',
                'invoice_used_id' => $invoiceId,
                'updated_by' => $userId
            ]);
        }

        return round($total, 2);
    }

    protected function calculateRebates(BillingAccount $account, Carbon $date, float $monthlyFee): float
    {
        $total = 0;
        $currentMonth = $date->format('F');
        
        $customer = $account->customer;
        if (!$customer) {
            return 0;
        }

        $technicalDetails = $account->technicalDetails->first();
        if (!$technicalDetails) {
            return 0;
        }

        $rebates = MassRebate::where('status', 'Unused')
            ->where('month', $currentMonth)
            ->get();

        $daysInCurrentMonth = $date->daysInMonth;
        $dailyRate = $monthlyFee / $daysInCurrentMonth;

        foreach ($rebates as $rebate) {
            $matchFound = false;

            if ($rebate->rebate_type === 'lcpnap') {
                if ($technicalDetails->lcpnap && $technicalDetails->lcpnap === $rebate->selected_rebate) {
                    $matchFound = true;
                }
            } elseif ($rebate->rebate_type === 'lcp') {
                if ($technicalDetails->lcp && $technicalDetails->lcp === $rebate->selected_rebate) {
                    $matchFound = true;
                }
            } elseif ($rebate->rebate_type === 'location') {
                if (($customer->location && $customer->location === $rebate->selected_rebate) ||
                    ($customer->barangay && $customer->barangay === $rebate->selected_rebate)) {
                    $matchFound = true;
                }
            }

            if ($matchFound) {
                $rebateUsage = RebateUsage::where('rebates_id', $rebate->id)
                    ->where('account_no', $account->account_no)
                    ->where('status', 'Unused')
                    ->first();

                if ($rebateUsage) {
                    $rebateDays = $rebate->number_of_dates ?? 0;
                    $rebateValue = $dailyRate * $rebateDays;
                    $total += $rebateValue;
                }
            }
        }

        return round($total, 2);
    }

    protected function calculateServiceFees(BillingAccount $account, Carbon $date, int $userId): float
    {
        $total = 0;

        $serviceFees = DB::table('service_charge_logs')
            ->where('account_no', $account->account_no)
            ->where('status', 'Unused')
            ->get();

        foreach ($serviceFees as $fee) {
            $total += $fee->service_charge;
            
            DB::table('service_charge_logs')
                ->where('id', $fee->id)
                ->update([
                    'status' => 'Used',
                    'date_used' => now(),
                    'updated_at' => now()
                ]);
        }

        return round($total, 2);
    }

    protected function calculatePaymentReceived(BillingAccount $account, Carbon $date): float
    {
        $lastMonth = $date->copy()->subMonth();
        
        $transactions = DB::table('transactions')
            ->where('account_no', $account->account_no)
            ->where('status', 'Done')
            ->whereMonth('payment_date', $lastMonth->month)
            ->whereYear('payment_date', $lastMonth->year)
            ->sum('received_payment');

        return floatval($transactions);
    }

    protected function extractPlanName(string $desiredPlan): string
    {
        if (strpos($desiredPlan, ' - ') !== false) {
            $parts = explode(' - ', $desiredPlan);
            return trim($parts[0]);
        }
        
        return trim($desiredPlan);
    }

    protected function getPreviousBalance(BillingAccount $account, Carbon $currentDate): float
    {
        $accountBalance = floatval($account->account_balance);
        
        $this->log('info', 'Getting previous balance for SOA', [
            'account_no' => $account->account_no,
            'account_balance' => $accountBalance,
            'current_date' => $currentDate->format('Y-m-d')
        ]);
        
        return $accountBalance;
    }

    protected function markDiscountsAsUsed(BillingAccount $account, int $userId, string $invoiceId): void
    {
        $discounts = Discount::where('account_no', $account->account_no)
            ->whereIn('status', ['Unused', 'Permanent', 'Monthly'])
            ->get();

        foreach ($discounts as $discount) {
            if ($discount->status === 'Unused') {
                $discount->update([
                    'status' => 'Used',
                    'invoice_used_id' => $invoiceId,
                    'used_date' => now(),
                    'updated_by_user_id' => $userId
                ]);
            } elseif ($discount->status === 'Permanent') {
                $discount->update([
                    'invoice_used_id' => $invoiceId,
                    'updated_by_user_id' => $userId
                ]);
            } elseif ($discount->status === 'Monthly' && $discount->remaining > 0) {
                $discount->update([
                    'invoice_used_id' => $invoiceId,
                    'remaining' => $discount->remaining - 1,
                    'updated_by_user_id' => $userId
                ]);
            }
        }
    }

    protected function markRebatesAsUsed(BillingAccount $account, int $userId, string $invoiceId): void
    {
        $currentMonth = Carbon::now()->format('F');
        $customer = $account->customer;
        
        if (!$customer) {
            return;
        }

        $technicalDetails = $account->technicalDetails->first();
        if (!$technicalDetails) {
            return;
        }

        $rebates = MassRebate::where('status', 'Unused')
            ->where('month', $currentMonth)
            ->get();

        foreach ($rebates as $rebate) {
            $matchFound = false;

            if ($rebate->rebate_type === 'lcpnap') {
                if ($technicalDetails->lcpnap && $technicalDetails->lcpnap === $rebate->selected_rebate) {
                    $matchFound = true;
                }
            } elseif ($rebate->rebate_type === 'lcp') {
                if ($technicalDetails->lcp && $technicalDetails->lcp === $rebate->selected_rebate) {
                    $matchFound = true;
                }
            } elseif ($rebate->rebate_type === 'location') {
                if (($customer->location && $customer->location === $rebate->selected_rebate) ||
                    ($customer->barangay && $customer->barangay === $rebate->selected_rebate)) {
                    $matchFound = true;
                }
            }

            if ($matchFound) {
                $rebateUsage = RebateUsage::where('rebates_id', $rebate->id)
                    ->where('account_no', $account->account_no)
                    ->where('status', 'Unused')
                    ->first();

                if ($rebateUsage) {
                    $rebateUsage->update(['status' => 'Used']);
                    $this->checkAndUpdateRebateStatus($rebate->id, $userId);
                }
            }
        }
    }

    protected function checkAndUpdateRebateStatus(int $rebateId, int $userId): void
    {
        $unusedCount = RebateUsage::where('rebates_id', $rebateId)
            ->where('status', 'Unused')
            ->count();

        if ($unusedCount === 0) {
            $rebate = MassRebate::find($rebateId);
            if ($rebate) {
                $rebate->update([
                    'status' => 'Used',
                    'modified_by' => (string) $userId,
                    'modified_date' => now()
                ]);
            }
        }
    }

    protected function trackStaggeredInvoiceAssociation(string $accountNo, int $invoiceId): void
    {
        try {
            $staggeredInstallations = StaggeredInstallation::where('account_no', $accountNo)
                ->where('status', 'Active')
                ->where('months_to_pay', '>', 0)
                ->get();

            foreach ($staggeredInstallations as $staggered) {
                $monthColumn = null;
                for ($i = 1; $i <= 12; $i++) {
                    $col = 'month' . $i;
                    if (empty($staggered->$col)) {
                        $monthColumn = $col;
                        break;
                    }
                }

                if (!$monthColumn) {
                    continue;
                }

                $staggered->$monthColumn = (string)$invoiceId;
                $staggered->months_to_pay = $staggered->months_to_pay - 1;

                if ($staggered->months_to_pay <= 0) {
                    $staggered->status = 'Completed';
                }

                $staggered->modified_by = 'system';
                $staggered->modified_date = now();
                $staggered->timestamps = false;
                $staggered->save();
            }
        } catch (\Exception $e) {
            $this->log('error', 'Error tracking staggered invoice association: ' . $e->getMessage());
        }
    }
}
