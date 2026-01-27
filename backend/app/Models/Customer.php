<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $table = 'customers';

    protected $fillable = [
        'first_name',
        'middle_initial',
        'last_name',
        'email_address',
        'contact_number_primary',
        'contact_number_secondary',
        'address',
        'location',
        'barangay',
        'city',
        'region',
        'address_coordinates',
        'housing_status',
        'referred_by',
        'desired_plan',
        'house_front_picture_url',
        'group_id',
        'created_by',
        'updated_by',
    ];

    protected $appends = ['full_name'];

    /**
     * Get the billing accounts associated with the customer.
     */
    public function billingAccounts()
    {
        return $this->hasMany(BillingAccount::class);
    }

    /**
     * Get the group associated with the customer.
     */
    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * Get the user who created the customer.
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated the customer.
     */
    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get customer's full name.
     */
    public function getFullNameAttribute()
    {
        return trim($this->first_name . ' ' . $this->middle_initial . ' ' . $this->last_name);
    }
}
