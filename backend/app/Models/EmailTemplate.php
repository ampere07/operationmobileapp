<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    use HasFactory;

    protected $table = 'email_templates';

    protected $primaryKey = 'Template_Code';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'Template_Code',
        'Subject_Line',
        'CC',        // ADD THIS LINE
        'BCC',       // ADD THIS LINE
        'Body_HTML',
        'Description',
        'Is_Active'
    ];

    protected $casts = [
        'Is_Active' => 'boolean',
        'Body_HTML' => 'string'
    ];
}
