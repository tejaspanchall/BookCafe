<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        $products = Product::orderBy('id', 'desc')->get();
        return response()->json($products);
    }

    public function search(Request $request): JsonResponse
    {
        $query = $request->input('query');
        
        $products = Product::where('name', 'like', "%{$query}%")
            ->orWhere('category', 'like', "%{$query}%")
            ->orderBy('id', 'desc')
            ->get();
            
        return response()->json($products);
    }
    
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
            'stock_value' => 'nullable|integer|min:0'
        ]);
        
        // Set default stock value if not provided
        $stockValue = isset($validated['stock_value']) ? $validated['stock_value'] : 0;
        
        try {
            // Begin transaction
            DB::beginTransaction();
            
            // Use raw query with CTE to insert product and stock in one transaction
            $result = DB::select("
                WITH new_product AS (
                    INSERT INTO dmi_products (name, category, price)
                    VALUES (?, ?, ?)
                    RETURNING id
                )
                INSERT INTO product_stock (product_id, stock_value)
                SELECT id, ? FROM new_product
                RETURNING product_id
            ", [
                $validated['name'],
                $validated['category'],
                $validated['price'],
                $stockValue
            ]);
            
            // Commit transaction
            DB::commit();
            
            // Get the newly created product with its stock value
            $productId = $result[0]->product_id;
            $product = Product::findOrFail($productId);
            
            return response()->json($product, 201);
        } catch (\Exception $e) {
            // Rollback transaction in case of failure
            DB::rollBack();
            return response()->json(['message' => 'Failed to create product: ' . $e->getMessage()], 500);
        }
    }
    
    public function update(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
            'stock_value' => 'nullable|integer|min:0'
        ]);
        
        // Set default stock value if not provided
        $stockValue = isset($validated['stock_value']) ? $validated['stock_value'] : 0;
        
        try {
            // Begin transaction
            DB::beginTransaction();
            
            // Update product
            DB::update("
                UPDATE dmi_products
                SET name = ?, category = ?, price = ?
                WHERE id = ?
            ", [
                $validated['name'],
                $validated['category'],
                $validated['price'],
                $id
            ]);
            
            // Check if stock exists and update or insert accordingly
            $stockExists = DB::table('product_stock')->where('product_id', $id)->exists();
            
            if ($stockExists) {
                // Update existing stock
                DB::update("
                    UPDATE product_stock 
                    SET stock_value = ?
                    WHERE product_id = ?
                ", [$stockValue, $id]);
            } else {
                // Insert new stock
                DB::insert("
                    INSERT INTO product_stock (product_id, stock_value)
                    VALUES (?, ?)
                ", [$id, $stockValue]);
            }
            
            // Commit transaction
            DB::commit();
            
            // Get the updated product with its stock value
            $product = Product::findOrFail($id);
            
            return response()->json($product);
        } catch (\Exception $e) {
            // Rollback transaction in case of failure
            DB::rollBack();
            return response()->json(['message' => 'Failed to update product: ' . $e->getMessage()], 500);
        }
    }
    
    public function destroy($id): JsonResponse
    {
        try {
            DB::beginTransaction();
            
            $product = Product::findOrFail($id);
            
            // Delete associated stock record
            DB::table('product_stock')->where('product_id', $id)->delete();
            
            // Delete the product
            $product->delete();
            
            DB::commit();
            
            return response()->json(null, 204);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to delete product: ' . $e->getMessage()], 500);
        }
    }
    
    public function getStock($id): JsonResponse
    {
        $product = Product::findOrFail($id);
        return response()->json($product);
    }
} 