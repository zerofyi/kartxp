<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AuthController extends Controller
{

    // Login process start:
    public function login()
    {
        return Inertia::render('auth/login');
    }

    public function signin(Request $request)
    {
        $credentials = $request->validate([
            'login'    => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $loginType = filter_var($credentials['login'], FILTER_VALIDATE_EMAIL) ? 'email' : 'mobile';

        $authCredentials = [
            $loginType  => $credentials['login'],
            'password'  => $credentials['password'],
        ];

        $remember = $request->filled('remember');

        if (Auth::attempt($authCredentials, $remember)) {
            $request->session()->regenerate();
            $user = Auth::user();

            if ($user->status !== 'active') {
                Auth::logout();
                return back()->withErrors([
                    'status' => 'Your account is inactive. Please contact support.'
                ])->withInput($request->except('password'));
            }

            // Invalidate other sessions (if using database session driver)
            DB::table('sessions')
                ->where('user_id', $user->user_id)
                ->where('id', '!=', session()->getId())
                ->delete();

            // Optional: Add flash message
            session()->flash('success', 'Login successful!');

            // Warehouse shop check
            if ($user->role === 'warehouse' && !$user->shop) {
                Log::warning("Warehouse {$user->user_id} doesn't have shop information.");
                session()->flash('warning', 'Shop information not found. Please contact support.');
            }

            return match ($user->role) {
                'admin'       => redirect()->route('admin.dashboard'),
                'warehouse' => redirect()->route('warehouse.dashboard'),
                'customer'    => redirect()->route('customer.dashboard'),
                default       => redirect()->route('index'),
            };
        }

        return back()->withErrors([
            'credentials' => 'The provided credentials do not match our records.',
        ])->withInput($request->except('password'));
    }

    // Login process end:


    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('index');
    }
}
