<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewApplicationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $application;

    public function __construct($application)
    {
        $this->application = $application;
    }

    public function broadcastOn()
    {
        return new Channel('applications');
    }

    public function broadcastAs()
    {
        return 'new-application';
    }

    public function broadcastWith()
    {
        return [
            'id' => $this->application->id,
            'customer_name' => $this->application->customer ? $this->application->customer->full_name : 'Unknown',
            'plan_name' => $this->application->plan ? $this->application->plan->plan_name : 'Unknown',
            'status' => $this->application->status,
            'created_at' => $this->application->created_at,
            'formatted_date' => $this->application->created_at->diffForHumans(),
        ];
    }
}
