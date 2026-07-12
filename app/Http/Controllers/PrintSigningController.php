<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PrintSigningController extends Controller
{
    /**
     * Serve the digital certificate public block to the frontend client.
     */
    public function getCertificate(): Response
    {
        $path = storage_path('app/secure/digital-certificate.txt');

        if (!file_exists($path)) {
            return response('Certificate missing', 404);
        }

        return response(file_get_contents($path), 200)
            ->header('Content-Type', 'text/plain');
    }

    /**
     * Encrypt the raw client hardware request challenge via local OpenSSL signature strings.
     */
    public function signMessage(Request $request): Response
    {
        $request->validate([
            'request' => 'required|string',
        ]);

        $path = storage_path('app/secure/private-key.pem');

        if (!file_exists($path)) {
            return response('Private key missing', 500);
        }

        $privateKey = file_get_contents($path);
        $toSign = $request->input('request');

        if (openssl_sign($toSign, $signature, $privateKey, OPENSSL_ALGO_SHA512)) {
            return response(base64_encode($signature), 200)
                ->header('Content-Type', 'text/plain');
        }

        return response('Signing payload failed', 500);
    }
}
