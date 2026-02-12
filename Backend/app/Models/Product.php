<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Product extends Model
{
    protected $table = 'dmi_products';
    
    protected $fillable = [
        'name',
        'category',
        'price',
        'stock_value'
    ];
    
    protected $appends = ['stock_value'];
    
    public function getStockValueAttribute()
    {
        $stock = DB::table('product_stock')
            ->where('product_id', $this->id)
            ->first();
            
        return $stock ? $stock->stock_value : 0;
    }
} 