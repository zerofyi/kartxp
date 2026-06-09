<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * Notification channels available for broadcast.
     */
    private const CHANNELS = ['database', 'broadcast', 'mail'];

    /**
     * Display the admin notification center.
     */
    public function index(Request $request): Response
    {
        /** @var User $admin */
        $admin = Auth::user();

        $query = $admin->notifications()
            ->when($request->type, fn ($q, $t) => $q->where('type', 'like', "%{$t}%"))
            ->when($request->filled('read'), function ($q) use ($request) {
                if ($request->read === '1') {
                    $q->whereNotNull('read_at');
                } else {
                    $q->whereNull('read_at');
                }
            });

        $notifications     = $query->latest()->paginate(30)->withQueryString();
        $unreadCount       = $admin->unreadNotifications()->count();

        return Inertia::render('Admin/Notifications/Index', [
            'notifications' => $notifications,
            'unreadCount'   => $unreadCount,
            'filters'       => $request->only(['type', 'read']),
        ]);
    }

    /**
     * Mark one notification as read.
     */
    public function markRead(string $id): RedirectResponse
    {
        /** @var User $admin */
        $admin = Auth::user();

        $notification = $admin->notifications()->where('id', $id)->firstOrFail();
        $notification->markAsRead();

        return redirect()->back()->with('success', 'Notification marked as read.');
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllRead(): RedirectResponse
    {
        /** @var User $admin */
        $admin = Auth::user();
        $admin->unreadNotifications()->update(['read_at' => now()]);

        return redirect()->back()->with('success', 'All notifications marked as read.');
    }

    /**
     * Delete a notification.
     */
    public function destroy(string $id): RedirectResponse
    {
        /** @var User $admin */
        $admin = Auth::user();

        $admin->notifications()->where('id', $id)->delete();

        return redirect()->back()->with('success', 'Notification deleted.');
    }

    /**
     * Broadcast (send) a system notification to one or more users.
     */
    public function broadcast(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title'      => ['required', 'string', 'max:200'],
            'body'       => ['required', 'string', 'max:1000'],
            'channels'   => ['required', 'array', 'min:1'],
            'channels.*' => ['string', Rule::in(self::CHANNELS)],
            'target'     => ['required', 'string', Rule::in(['all', 'role', 'specific'])],
            'role'       => ['nullable', 'string', 'required_if:target,role', 'exists:roles,name'],
            'user_ids'   => ['nullable', 'array', 'required_if:target,specific'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        /** @var User $admin */
        $admin = Auth::user();

        // Resolve target users
        $recipients = match ($data['target']) {
            'all'      => User::active()->get(),
            'role'     => User::role($data['role'])->active()->get(),
            'specific' => User::whereIn('id', $data['user_ids'] ?? [])->get(),
            default    => collect(),
        };

        if ($recipients->isEmpty()) {
            return redirect()->back()->with('error', 'No recipients found for the given target.');
        }

        // Build notification payload
        $notificationData = [
            'title'      => $data['title'],
            'body'       => $data['body'],
            'sent_by'    => $admin->id,
            'sent_by_name' => $admin->name,
        ];

        // Use Laravel's generic database notification
        foreach ($recipients->chunk(100) as $chunk) {
            foreach ($chunk as $user) {
                $user->notify(new \App\Notifications\AdminBroadcastNotification($notificationData));
            }
        }

        activity()
            ->causedBy($admin)
            ->withProperties([
                'target'      => $data['target'],
                'recipients'  => $recipients->count(),
                'channels'    => $data['channels'],
                'title'       => $data['title'],
            ])
            ->log('Admin broadcast notification');

        return redirect()->back()
                         ->with('success', "Notification sent to {$recipients->count()} user(s).");
    }

    /**
     * Return unread notification count as JSON (for polling/badge updates).
     */
    public function unreadCount(): JsonResponse
    {
        /** @var User $admin */
        $admin = Auth::user();

        return response()->json([
            'success' => true,
            'data'    => ['count' => $admin->unreadNotifications()->count()],
            'message' => 'Unread notification count retrieved.',
        ]);
    }

    /**
     * Clear all notifications for the admin.
     */
    public function clearAll(): RedirectResponse
    {
        /** @var User $admin */
        $admin = Auth::user();
        $admin->notifications()->delete();

        return redirect()->back()->with('success', 'All notifications cleared.');
    }
}
