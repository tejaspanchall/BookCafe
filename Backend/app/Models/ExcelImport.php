<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExcelImport extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'file_id',
        'original_name'
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
} 