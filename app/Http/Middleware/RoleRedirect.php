<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleRedirect
{
    /**
     * Role-to-dashboard URL mapping.
     *
     * Used after a successful login to send users to their correct portal.
     */
    private const ROLE_DESTINATIONS = [
        'admin'          => '/admin/dashboard',
        'warehouse'      => '/warehouse/dashboard',
        'manager'        => '/manager/dashboard',
        'staff'          => '/staff/dashboard',
        'delivery_agent' => '/agent/dashboard',
        'customer'       => '/',
    ];

    /**
     * Handle an incoming request.
     *
     * If the user is already authenticated, redirect them to their
     * role-appropriate dashboard. Otherwise pass through to the next handler.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);
        }

        $role        = (string) ($user->role ?? 'customer');
        $destination = self::ROLE_DESTINATIONS[$role] ?? '/';

        return redirect($destination);
    }
}
