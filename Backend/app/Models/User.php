<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'firstname', 
        'lastname', 
        'email', 
        'password', 
        'role',
        'reset_token'
    ];

    protected $hidden = [
        'password', 
        'reset_token'
    ];

    protected $casts = [
        'role' => 'string'
    ];

    public function books()
    {
        return $this->belongsToMany(Book::class, 'user_books');
    }
}