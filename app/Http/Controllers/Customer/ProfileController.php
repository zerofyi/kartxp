<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $customer = $user->customer;

        $addresses = Address::where('user_id', $user->id)->get();

        return Inertia::render('Customer/Profile/Index', [
            'user' => $user,
            'customer' => $customer,
            'addresses' => $addresses,
        ]);
    }

    public function storeAddress(Request $request): RedirectResponse
    {
        $request->validate([
            'label' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'line1' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'required|string|max:100',
            'pincode' => 'required|string|max:20',
        ]);

        $user = Auth::user();

        if ($request->is_default) {
            Address::where('user_id', $user->id)->update(['is_default' => false]);
        }

        Address::create([
            ...$request->all(),
            'user_id' => $user->id,
            'customer_id' => $user->customer?->id,
        ]);

        return back()->with('success', 'Address added successfully.');
    }
}
