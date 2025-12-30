'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSignUpEmailPassword } from '@nhost/react';
import { toast } from 'sonner';
import { Sparkles, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export default function SignupPage() {
    const router = useRouter();
    const { signUpEmailPassword, isLoading } = useSignUpEmailPassword();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password || !confirmPassword) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        const { isError, error, isSuccess } = await signUpEmailPassword(email, password, {
            displayName: name,
            metadata: { name }
        });

        if (isError) {
            toast.error(error?.message || 'Signup failed');
            return;
        }

        if (isSuccess) {
            setSuccess(true);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
                <div className="fixed inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/10 via-transparent to-transparent" />

                <div className="relative z-10 w-full max-w-md text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Check your email</h1>
                    <p className="text-zinc-400 mb-8">
                        We&apos;ve sent a verification link to <span className="text-white">{email}</span>.
                        Click the link to verify your account.
                    </p>
                    <Button asChild className="bg-white text-black hover:bg-zinc-200">
                        <Link href="/login">Continue to Login</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />

            {/* Content */}
            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <header className="p-6">
                    <Button variant="ghost" asChild className="text-zinc-400 hover:text-white">
                        <Link href="/">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Link>
                    </Button>
                </header>

                {/* Form */}
                <main className="flex-1 flex items-center justify-center px-6 py-8">
                    <div className="w-full max-w-md">
                        <div className="text-center mb-8">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Create your account</h1>
                            <p className="text-zinc-400">Start chatting with AI for free</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-2">
                                    Name <span className="text-zinc-600">(optional)</span>
                                </label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="bg-zinc-900 border-zinc-800 focus:border-zinc-700"
                                    disabled={isLoading}
                                />
                            </div>

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

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-zinc-400 mb-2">
                                    Password
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-zinc-900 border-zinc-800 focus:border-zinc-700"
                                    disabled={isLoading}
                                    required
                                />
                                <p className="text-xs text-zinc-600 mt-1">Must be at least 8 characters</p>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-400 mb-2">
                                    Confirm Password
                                </label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
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
                                        Creating account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </Button>
                        </form>

                        <p className="mt-6 text-xs text-zinc-600 text-center">
                            By signing up, you agree to our{' '}
                            <Link href="/terms" className="text-zinc-400 hover:text-white">Terms</Link>
                            {' '}and{' '}
                            <Link href="/privacy" className="text-zinc-400 hover:text-white">Privacy Policy</Link>
                        </p>

                        <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
                            <p className="text-zinc-500">
                                Already have an account?{' '}
                                <Link href="/login" className="text-white hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
