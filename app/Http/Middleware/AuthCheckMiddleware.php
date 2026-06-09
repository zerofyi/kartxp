<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Role-gating middleware. Use as check:role1,role2,...
 * If no roles passed, it just ensures authentication.
 */
class AuthCheckMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // if (! Auth::check()) {
        //     return redirect()->route('login')->with('error', 'Please login to continue.');
        // }

        $user = Auth::user();

        // If no roles specified, allow any authenticated user
        if (empty($roles)) {
            return $next($request);
        }

        // Check if user's role is in the allowed list
        if (in_array($user->role, $roles, true)) {
            return $next($request);
        }

        // Role mismatch: redirect to appropriate panel
        return $this->redirectByRole($user->role);
    }

    private function redirectByRole(string $role): Response
    {
        return match ($role) {
            'admin'          => redirect()->route('admin.dashboard'),
            'warehouse'      => redirect()->route('warehouse.dashboard'),
            'manager'        => redirect()->route('manager.dashboard'),
            'staff'          => redirect()->route('staff.dashboard'),
            'delivery_agent' => redirect()->route('agent.dashboard'),
            'customer'       => redirect('/'),
            default          => redirect('/'),
        };
    }
}
