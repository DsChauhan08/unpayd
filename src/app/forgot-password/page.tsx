'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResetPassword } from '@nhost/react';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
    const { resetPassword, isLoading } = useResetPassword();
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error('Please enter your email');
            return;
        }

        const { isError, error } = await resetPassword(email, {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
        });

        if (isError) {
            toast.error(error?.message || 'Failed to send reset email');
            return;
        }

        setSuccess(true);
        toast.success('Reset email sent');
    };

    if (success) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
                        <Mail className="w-8 h-8 text-blue-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Check your email</h1>
                    <p className="text-zinc-400 mb-8">
                        If an account exists for <span className="text-white">{email}</span>,
                        we've sent a password reset link.
                    </p>
                    <Button asChild variant="outline" className="border-zinc-800 text-white hover:bg-zinc-900">
                        <Link href="/login">Back to Login</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-md">
                <Link href="/login" className="inline-flex items-center text-zinc-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                </Link>

                <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
                <p className="text-zinc-400 mb-8">Enter your email to receive a reset link</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-2">
                            Email
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="bg-zinc-900 border-zinc-800 focus:border-zinc-700"
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-white text-black hover:bg-zinc-200"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            'Send Reset Link'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
