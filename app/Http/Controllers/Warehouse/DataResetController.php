<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Services\FreshStartService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DataResetController extends Controller
{
    public function __construct(
        protected FreshStartService $freshStart
    ) {}

    public function index(): Response
    {
        return Inertia::render('Warehouse/Settings/DataReset', [
            'preview' => $this->freshStart->preview(),
        ]);
    }

    public function execute(Request $request): RedirectResponse
    {
        $request->validate([
            'confirmation' => ['required', 'string', 'in:FRESH START'],
            'backup_confirmed' => ['required', 'accepted'],
        ], [
            'confirmation.in' => 'Type FRESH START exactly to confirm the reset.',
        ]);

        $result = $this->freshStart->execute(Auth::user());

        return redirect()->route('warehouse.settings.data-reset')
            ->with('success', "Fresh start complete. {$result['total_deleted']} transaction records deleted and {$result['customers_reset']} customer totals reset. Catalog and customer data are untouched.");
    }
}
