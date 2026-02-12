<?php

namespace App\Traits;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

trait AuthCacheTrait
{
    /**
     * Get auth data directly without caching
     */
    protected function getAuthData($callback)
    {
        return $callback();
    }

    /**
     * Invalidate auth cache by pattern
     */
    protected function invalidateAuthCache($pattern)
    {
        try {
            $keys = Redis::keys($pattern);
            if (!empty($keys)) {
                Redis::del($keys);
            }
        } catch (\Exception $e) {
            // Log the error but continue execution
            Log::warning("Failed to invalidate cache with pattern {$pattern}: " . $e->getMessage());
        }
    }

    /**
     * Get cache key for user permissions - for reference only
     * Permissions are not actually cached
     */
    protected function getUserPermissionsCacheKey($userId)
    {
        return "auth:user:{$userId}:permissions";
    }

    /**
     * Get cache key for user roles - for reference only
     * Roles are not actually cached
     */
    protected function getUserRolesCacheKey($userId)
    {
        return "auth:user:{$userId}:roles";
    }
} 