<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityLogController extends Controller
{
    /**
     * List all activity log entries with filters.
     */
    public function index(Request $request): Response
    {
        $query = DB::table('activity_log')
            ->leftJoin('users as causer', function ($join) {
                $join->on('causer.id', '=', 'activity_log.causer_id')
                     ->where('activity_log.causer_type', '=', 'App\\Models\\User');
            })
            ->select([
                'activity_log.id',
                'activity_log.log_name',
                'activity_log.description',
                'activity_log.subject_type',
                'activity_log.subject_id',
                'activity_log.causer_type',
                'activity_log.causer_id',
                'activity_log.properties',
                'activity_log.created_at',
                'causer.name as causer_name',
                'causer.email as causer_email',
            ])
            ->when($request->search, function ($q, $s) {
                $q->where(function ($inner) use ($s) {
                    $inner->where('activity_log.description', 'like', "%{$s}%")
                          ->orWhere('causer.name', 'like', "%{$s}%")
                          ->orWhere('causer.email', 'like', "%{$s}%");
                });
            })
            ->when($request->log_name, fn ($q, $ln) => $q->where('activity_log.log_name', $ln))
            ->when($request->causer_id, fn ($q, $cid) => $q->where('activity_log.causer_id', $cid))
            ->when($request->subject_type, function ($q, $type) {
                $q->where('activity_log.subject_type', 'like', "%{$type}%");
            })
            ->when($request->date_from, fn ($q, $d) => $q->whereDate('activity_log.created_at', '>=', $d))
            ->when($request->date_to, fn ($q, $d) => $q->whereDate('activity_log.created_at', '<=', $d))
            ->orderByDesc('activity_log.created_at');

        $logs = $query->paginate(50)->withQueryString();

        // Decode properties JSON for each row
        $logs->getCollection()->transform(function ($log) {
            $log->properties = $log->properties ? json_decode($log->properties, true) : [];
            return $log;
        });

        // Available log names and subject types for filter dropdowns
        $logNames = DB::table('activity_log')
                      ->distinct()
                      ->orderBy('log_name')
                      ->pluck('log_name');

        $subjectTypes = DB::table('activity_log')
                          ->distinct()
                          ->orderBy('subject_type')
                          ->pluck('subject_type')
                          ->map(fn ($t) => class_basename($t));

        return Inertia::render('Admin/ActivityLog/Index', [
            'logs'         => $logs,
            'logNames'     => $logNames,
            'subjectTypes' => $subjectTypes,
            'filters'      => $request->only([
                'search', 'log_name', 'causer_id', 'subject_type', 'date_from', 'date_to',
            ]),
        ]);
    }

    /**
     * Export activity logs as CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date'],
            'log_name'  => ['nullable', 'string'],
        ]);

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="activity_log_' . now()->format('Ymd_His') . '.csv"',
        ];

        $callback = function () use ($request) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Log', 'Description', 'Subject Type', 'Subject ID', 'Causer', 'Causer Email', 'Created At']);

            DB::table('activity_log')
                ->leftJoin('users as causer', function ($join) {
                    $join->on('causer.id', '=', 'activity_log.causer_id')
                         ->where('activity_log.causer_type', '=', 'App\\Models\\User');
                })
                ->select([
                    'activity_log.id',
                    'activity_log.log_name',
                    'activity_log.description',
                    'activity_log.subject_type',
                    'activity_log.subject_id',
                    'activity_log.created_at',
                    'causer.name as causer_name',
                    'causer.email as causer_email',
                ])
                ->when($request->log_name, fn ($q, $ln) => $q->where('activity_log.log_name', $ln))
                ->when($request->date_from, fn ($q, $d) => $q->whereDate('activity_log.created_at', '>=', $d))
                ->when($request->date_to, fn ($q, $d) => $q->whereDate('activity_log.created_at', '<=', $d))
                ->orderByDesc('activity_log.created_at')
                ->chunk(500, function ($rows) use ($handle) {
                    foreach ($rows as $row) {
                        fputcsv($handle, [
                            $row->id,
                            $row->log_name,
                            $row->description,
                            class_basename($row->subject_type),
                            $row->subject_id,
                            $row->causer_name ?? 'System',
                            $row->causer_email ?? 'N/A',
                            $row->created_at,
                        ]);
                    }
                });

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Purge old activity logs (older than N days).
     */
    public function purge(Request $request): \Illuminate\Http\RedirectResponse
    {
        $data = $request->validate([
            'older_than_days' => ['required', 'integer', 'min:7', 'max:365'],
        ]);

        $count = DB::table('activity_log')
                   ->where('created_at', '<', now()->subDays($data['older_than_days']))
                   ->delete();

        return redirect()->back()
                         ->with('success', "Purged {$count} log entries older than {$data['older_than_days']} days.");
    }
}
