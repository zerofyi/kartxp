<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureWarehouseAccess
{
    /**
     * Handle an incoming request.
     *
     * Grants access when the authenticated user:
     *   1. Has the 'admin' role (global admin sees all warehouses), OR
     *   2. Is listed in warehouse_users for the warehouse_id resolved from
     *      the route parameter {warehouse} or {warehouse_id}, AND the
     *      warehouse_users record is active (is_active = true).
     *
     * Usage in routes:
     *   Route::middleware(['auth', 'warehouse.access'])->group(...)
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user === null) {
            return $this->unauthorizedResponse($request, 'Unauthenticated.');
        }

        // Global admins bypass warehouse-level access checks
        if ((string) $user->role === 'admin') {
            return $next($request);
        }

        // Resolve warehouse ID from multiple possible route parameter names
        $warehouseId = $this->resolveWarehouseId($request);

        if ($warehouseId === null) {
            Log::warning('EnsureWarehouseAccess: Could not resolve warehouse_id from route.', [
                'user_id'    => $user->id,
                'url'        => $request->fullUrl(),
                'parameters' => $request->route()?->parameters(),
            ]);

            return $this->unauthorizedResponse($request, 'Warehouse not specified.');
        }

        // Check warehouse_users table for an active assignment
        $hasAccess = DB::table('warehouse_users')
            ->where('warehouse_id', $warehouseId)
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();

        if (! $hasAccess) {
            Log::warning('EnsureWarehouseAccess: Access denied.', [
                'user_id'      => $user->id,
                'user_role'    => $user->role,
                'warehouse_id' => $warehouseId,
                'url'          => $request->fullUrl(),
            ]);

            return $this->unauthorizedResponse($request, 'You do not have access to this warehouse.');
        }

        return $next($request);
    }

    /**
     * Resolve the warehouse ID from various route parameter names.
     *
     * Supports: {warehouse}, {warehouse_id}, {id} (on warehouse-scoped routes).
     */
    private function resolveWarehouseId(Request $request): int|string|null
    {
        $route = $request->route();

        if ($route === null) {
            return null;
        }

        foreach (['warehouse', 'warehouse_id', 'id'] as $param) {
            $value = $route->parameter($param);

            if ($value !== null) {
                // If it's a model, get the key; otherwise return the raw value
                return is_object($value) ? $value->getKey() : $value;
            }
        }

        return null;
    }

    /**
     * Return an appropriate unauthorized response based on request type.
     *
     * API requests get a JSON 403 response; web requests are redirected home.
     */
    private function unauthorizedResponse(Request $request, string $message): Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'success' => false,
                'data'    => null,
                'message' => $message,
            ], Response::HTTP_FORBIDDEN);
        }

        return redirect()->route('home')->with('error', $message);
    }
}
