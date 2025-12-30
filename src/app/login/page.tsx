'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSignInEmailPassword } from '@nhost/react';
import { toast } from 'sonner';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { signInEmailPassword, isLoading } = useSignInEmailPassword();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        const { isError, error, isSuccess } = await signInEmailPassword(email, password);

        if (isError) {
            console.error('Login Error details:', error);

            if (error?.message?.includes('verified') || error?.message?.includes('verify')) {
                toast.error('Please verify your email address before logging in.');
            } else if (error?.status === 401) {
                toast.error('Invalid email or password.');
            } else {
                toast.error(error?.message || 'Login failed');
            }
            return;
        }

        if (isSuccess) {
            toast.success('Welcome back!');
            router.push('/chat');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />

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
                <main className="flex-1 flex items-center justify-center px-6">
                    <div className="w-full max-w-md">
                        <div className="text-center mb-8">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
                            <p className="text-zinc-400">Sign in to continue to Unpayd</p>
                        </div>

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
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-zinc-500 hover:text-white transition-colors"
                            >
                                Forgot your password?
                            </Link>
                        </div>

                        <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
                            <p className="text-zinc-500">
                                Don&apos;t have an account?{' '}
                                <Link href="/signup" className="text-white hover:underline">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
