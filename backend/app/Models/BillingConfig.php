<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillingConfig extends Model
{
    use HasFactory;

    protected $table = 'billing_config';

    public $timestamps = true;

    protected $fillable = [
        'advance_generation_day',
        'due_date_day',
        'disconnection_day',
        'overdue_day',
        'disconnection_notice',
        'updated_by'
    ];

    protected $casts = [
        'advance_generation_day' => 'integer',
        'due_date_day' => 'integer',
        'disconnection_day' => 'integer',
        'overdue_day' => 'integer',
        'disconnection_notice' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
