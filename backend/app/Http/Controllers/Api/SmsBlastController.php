<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SmsBlastController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = DB::table('sms_blast')
                ->leftJoin('billing_accounts', 'sms_blast.account_id', '=', 'billing_accounts.id')
                ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->leftJoin('users as creator', 'sms_blast.created_by_user_id', '=', 'creator.id')
                ->leftJoin('users as updater', 'sms_blast.updated_by_user_id', '=', 'updater.id')
                ->select(
                    'sms_blast.id',
                    'sms_blast.message',
                    'sms_blast.created_at',
                    'sms_blast.updated_at',
                    'customers.barangay',
                    'customers.city',
                    'creator.email_address as user_email',
                    'updater.email_address as modified_email'
                )
                ->orderBy('sms_blast.created_at', 'desc');

            if ($request->has('barangay') && $request->barangay !== 'All') {
                $query->where('customers.barangay', $request->barangay);
            }

            if ($request->has('city') && $request->city !== 'All') {
                $query->where('customers.city', $request->city);
            }

            $records = $query->get();

            // Format data for frontend
            $data = $records->map(function ($record) {
                return [
                    'id' => (string)$record->id,
                    'barangay' => $record->barangay ?? 'N/A',
                    'city' => $record->city ?? 'N/A',
                    'message' => $record->message,
                    'modifiedDate' => $record->updated_at ? \Carbon\Carbon::parse($record->updated_at)->format('n/j/Y g:i:s A') : \Carbon\Carbon::parse($record->created_at)->format('n/j/Y g:i:s A'),
                    'modifiedEmail' => $record->modified_email ?? $record->user_email ?? 'N/A',
                    'userEmail' => $record->user_email ?? 'N/A',
                ];
            });

            return response()->json(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
