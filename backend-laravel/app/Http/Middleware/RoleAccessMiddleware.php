<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleAccessMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $permissionCode
     */
    public function handle(Request $request, Closure $next, string $permissionCode): Response
    {
        $user = $request->user();

        // Cek apakah user sudah login
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized - Please login first'
            ], 401);
        }

        // Cek apakah user punya permission yang diminta
        $hasPermission = $user->role
            ->permissions()
            ->where('code', $permissionCode)
            ->exists();

        if (!$hasPermission) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden - Requires permission: ' . $permissionCode
            ], 403);
        }

        return $next($request);
    }
}
