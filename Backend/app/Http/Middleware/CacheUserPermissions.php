<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Traits\AuthCacheTrait;
use Illuminate\Support\Facades\Auth;

class CacheUserPermissions
{
    use AuthCacheTrait;

    // Cache duration in seconds (1 hour)
    const CACHE_DURATION = 3600;

    public function handle(Request $request, Closure $next)
    {
        if (Auth::check()) {
            $user = Auth::user();
            
            // Get user roles (without caching)
            $roles = $this->getAuthData(function() use ($user) {
                return $user->roles->pluck('name');
            });

            // Get user permissions (without caching)
            $permissions = $this->getAuthData(function() use ($user) {
                return $user->getAllPermissions()->pluck('name');
            });

            // Add data to user object
            $user->cached_roles = $roles;
            $user->cached_permissions = $permissions;
        }

        return $next($request);
    }
} 