<?php

namespace App\Http\Controllers;

use App\Models\Barcode;
use Illuminate\Http\Request;

class BarcodeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'barcode' => 'required|string|unique:barcodes,barcode',
        ]);

        Barcode::create([
            'product_variant_id' => $request->product_variant_id,
            'barcode' => $request->barcode,
            'is_primary' => true, // First barcode is always primary
        ]);

        return back()->with('success', 'Barcode assigned successfully.');
    }

    public function suggest(Request $request)
    {
        $request->validate(['product_variant_id' => 'required|exists:product_variants,id']);

        // Generate EAN-13 style barcode: prefix + variant id padded + random + check digit
        do {
            $prefix = '890'; // India GS1 prefix
            $middle = str_pad($request->product_variant_id, 5, '0', STR_PAD_LEFT);
            $random = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
            $partial = $prefix . $middle . $random;

            // EAN-13 check digit
            $sum = 0;
            foreach (str_split($partial) as $i => $digit) {
                $sum += $digit * ($i % 2 === 0 ? 1 : 3);
            }
            $checkDigit = (10 - ($sum % 10)) % 10;
            $barcode = $partial . $checkDigit;
        } while (Barcode::where('barcode', $barcode)->exists());

        return response()->json(['barcode' => $barcode]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Barcode $barcode)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Barcode $barcode)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Barcode $barcode)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Barcode $barcode)
    {
        //
    }
}
