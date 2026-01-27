<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $table = 'transactions';

    protected $fillable = [
        'account_no',
        'transaction_type',
        'received_payment',
        'payment_date',
        'date_processed',
        'processed_by_user_id',
        'payment_method_id',
        'payment_method',
        'reference_no',
        'or_no',
        'remarks',
        'status',
        'image_url',
        'created_by_user',
        'updated_by_user',
    ];

    protected $casts = [
        'payment_date' => 'datetime',
        'date_processed' => 'datetime',
        'received_payment' => 'decimal:2',
    ];

    public function account()
    {
        return $this->belongsTo(BillingAccount::class, 'account_no', 'account_no');
    }

    public function processedByUser()
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }



    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'transaction_id');
    }
}
