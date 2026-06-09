<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdminBroadcastNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     *
     * @param  array{title: string, body: string, sent_by: int, sent_by_name: string}  $data
     */
    public function __construct(
        protected readonly array $data
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation for the database channel.
     *
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'title'        => $this->data['title'],
            'body'         => $this->data['body'],
            'sent_by'      => $this->data['sent_by'],
            'sent_by_name' => $this->data['sent_by_name'],
            'type'         => 'admin_broadcast',
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'title'        => $this->data['title'],
            'body'         => $this->data['body'],
            'sent_by_name' => $this->data['sent_by_name'],
            'type'         => 'admin_broadcast',
        ]);
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->data['title'])
            ->greeting("Hello, {$notifiable->name}!")
            ->line($this->data['body'])
            ->line("Sent by: {$this->data['sent_by_name']}")
            ->line('This is an admin broadcast from GhorerBazar.');
    }
}
