<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Request;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public $resetToken;
    public $user;

    /**
     * Create a new message instance.
     */
    public function __construct($user, $resetToken)
    {
        $this->user = $user;
        $this->resetToken = $resetToken;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset Your Password',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Dynamically determine frontend URL from request origin or referer
        $frontendUrl = $this->getFrontendUrl();
        $resetUrl = $frontendUrl . '/reset-password?token=' . $this->resetToken;

        return new Content(
            htmlString: '
                <h1>Hello ' . $this->user->firstname . ',</h1>
                <p>You have requested to reset your password. Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="' . $resetUrl . '" style="background-color: #4F46E5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                </div>
                <p>Or copy and paste this URL into your browser:</p>
                <p style="word-break: break-all;"><a href="' . $resetUrl . '">' . $resetUrl . '</a></p>
                <p>If you did not request a password reset, please ignore this email.</p>
                <p>This link will expire in 60 minutes.</p>
                <p>Best regards,<br>Team BookCafe</p>
            '
        );
    }

    /**
     * Get the frontend URL by examining the request data.
     * 
     * @return string
     */
    private function getFrontendUrl(): string
    {
        // For production environment, use a hardcoded URL first
        if (app()->environment('production')) {
            // Use a specific production frontend URL
            return 'https://bookcafe-frontend.vercel.app';
        }
        
        // Check for Origin or Referer headers which typically contain the frontend URL
        $origin = Request::header('Origin');
        $referer = Request::header('Referer');
        
        if ($origin) {
            // Parse the origin to get just the base URL
            $parsedUrl = parse_url($origin);
            return $parsedUrl['scheme'] . '://' . $parsedUrl['host'] . (isset($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '');
        }
        
        if ($referer) {
            // Parse the referer to get just the base URL
            $parsedUrl = parse_url($referer);
            return $parsedUrl['scheme'] . '://' . $parsedUrl['host'] . (isset($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '');
        }
        
        // Check SANCTUM_STATEFUL_DOMAINS for frontend domains
        $statefulDomains = explode(',', env('SANCTUM_STATEFUL_DOMAINS', ''));
        if (!empty($statefulDomains)) {
            // Use the first domain that's not the backend
            $backendHost = parse_url(config('app.url'), PHP_URL_HOST);
            
            foreach ($statefulDomains as $domain) {
                $domain = trim($domain);
                if (!empty($domain) && $domain !== $backendHost && $domain !== 'localhost' && $domain !== '127.0.0.1') {
                    // Determine if we need http or https based on the domain
                    $scheme = (str_contains($domain, 'vercel.app') || str_contains($domain, '.com') || str_contains($domain, '.net')) ? 'https' : 'http';
                    return $scheme . '://' . $domain;
                }
            }
        }
        
        // Fallback to localhost for development
        return 'http://localhost:3000';
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
