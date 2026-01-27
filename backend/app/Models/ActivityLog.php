<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;

    protected $primaryKey = 'log_id';
    protected $table = 'activity_logs';

    protected $fillable = [
        'level',
        'action',
        'message',
        'user_id',
        'target_user_id',
        'resource_type',
        'resource_id',
        'ip_address',
        'user_agent',
        'additional_data',
    ];

    protected $casts = [
        'additional_data' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationship with user who performed the action
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    // Relationship with target user (for user management actions)
    public function targetUser()
    {
        return $this->belongsTo(User::class, 'target_user_id', 'user_id');
    }

    // Scopes for filtering
    public function scopeByLevel($query, $level)
    {
        return $query->where('level', $level);
    }

    public function scopeByAction($query, $action)
    {
        return $query->where('action', $action);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByResourceType($query, $resourceType)
    {
        return $query->where('resource_type', $resourceType);
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }
}
