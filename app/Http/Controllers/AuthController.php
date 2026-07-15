<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AuthController extends Controller
{
    /**
     * Display the login view.
     */
    public function login()
    {
        return Inertia::render('auth/login');
    }

    /**
     * Handle an inbound authentication request.
     */
    public function signin(Request $request)
    {
        $credentials = $request->validate([
            'login'    => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        // Determine if input is an email address or a mobile phone number
        $loginType = filter_var($credentials['login'], FILTER_VALIDATE_EMAIL) ? 'email' : 'mobile';

        $authCredentials = [
            $loginType => $credentials['login'],
            'password' => $credentials['password'],
        ];

        $remember = $request->filled('remember');

        if (Auth::attempt($authCredentials, $remember)) {
            $request->session()->regenerate();

            /** @var \App\Models\User $user */
            $user = Auth::user();

            // Guard against inactive accounts
            if ((string) $user->status !== 'active') {
                Auth::logout();
                return back()->withErrors([
                    'status' => 'Your account is inactive. Please contact support.'
                ])->withInput($request->except('password'));
            }

            // Clean up database session entries safely using the true user ID
            // if (config('session.driver') === 'database') {
            //     DB::table('sessions')
            //         ->where('user_id', $user->id)
            //         ->where('id', '!=', session()->getId())
            //         ->delete();
            // }

            if (Config::get('session.driver') === 'database') {
                try {
                    DB::transaction(function () use ($user) {
                        $maxSessions = 5;
                        $currentSessionId = session()->getId();

                        // 1. Fetch other sessions with a shared lock to prevent concurrent modifications
                        $userSessionIds = DB::table('sessions')
                            ->where('user_id', $user->id)
                            ->where('id', '!=', $currentSessionId)
                            ->orderBy('last_activity', 'desc')
                            ->lockForUpdate() // Prevents race conditions
                            ->pluck('id');

                        // Total active = current session (1) + historical sessions
                        $totalSessions = $userSessionIds->count() + 1;

                        if ($totalSessions > $maxSessions) {
                            $overflowCount = $totalSessions - $maxSessions;

                            // Pull the oldest records from the end of the collection
                            $idsToDelete = $userSessionIds->take(-$overflowCount)->toArray();

                            if (!empty($idsToDelete)) {
                                DB::table('sessions')
                                    ->whereIn('id', $idsToDelete)
                                    ->delete();
                            }
                        }
                    });
                } catch (\Throwable $e) {
                    // Prevent a session cleanup failure from crashing the user's entire login/request flow
                    Log::error('Failed to prune excess user sessions: ' . $e->getMessage(), [
                        'user_id' => $user->id
                    ]);
                }
            }

            // Core business logic validation check for warehouse owners
            if ($user->role === 'warehouse' && !$user->ownedWarehouse()->exists()) {
                Log::warning("Warehouse owner ID {$user->id} does not have an active warehouse record assigned.");

                // Immediately route to the warehouse dashboard with the precise warning message
                return redirect()->route('warehouse.dashboard')
                    ->with('warning', 'Warehouse configuration profile not found. Please contact support.');
            }

            return match ($user->role) {
                'admin'          => redirect()->route('admin.dashboard')->with('success', 'Login successful!'),
                'warehouse'      => redirect()->route('warehouse.dashboard')->with('success', 'Login successful!'),
                'manager'        => redirect()->route('manager.dashboard')->with('success', 'Login successful!'),
                'staff'          => redirect()->route('staff.dashboard')->with('success', 'Login successful!'),
                'delivery_agent' => redirect()->route('agent.dashboard')->with('success', 'Login successful!'),
                'customer'       => redirect()->route('customer.dashboard')->with('success', 'Login successful!'),
                default          => redirect()->route('home'),
            };
        }

        return back()->withErrors([
            'credentials' => 'The provided credentials do not match our records.',
        ])->withInput($request->except('password'));
    }

    /**
     * Log out the authenticated user out of the application framework.
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }
}
