<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthCheckMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!Auth::check()) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Unauthenticated.'], Response::HTTP_UNAUTHORIZED);
            }
            return redirect()->route('login')->with('error', 'Please login to continue.');
        }

        $user = Auth::user();

        if (empty($roles)) {
            return $next($request);
        }

        if (in_array($user->role, $roles, true)) {
            return $next($request);
        }

        // Production Fix: Abolished the redirect loop hazard. Throw direct 403 Forbidden.
        if ($request->expectsJson()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized access.'], Response::HTTP_FORBIDDEN);
        }

        abort(Response::HTTP_FORBIDDEN, 'You do not have permission to access this resource.');
    }
}
