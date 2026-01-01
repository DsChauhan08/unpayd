'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen bg-black">
                {/* Sidebar skeleton */}
                <div className="w-64 border-r border-zinc-800 p-4 space-y-4">
                    <Skeleton className="h-10 w-full bg-zinc-800" />
                    <Skeleton className="h-10 w-full bg-zinc-800" />
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full bg-zinc-800" />
                        ))}
                    </div>
                </div>
                {/* Main content skeleton */}
                <div className="flex-1 flex items-center justify-center">
                    <Skeleton className="h-12 w-96 bg-zinc-800 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <SidebarProvider defaultOpen={false}>
            <ChatSidebar
                onNewChat={() => router.push('/chat')}
            />
            <SidebarInset className="bg-background min-h-screen">
                <header className="flex items-center h-14 px-2 sm:px-4 border-b border-border sticky top-0 bg-background z-20">
                    <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                    <span className="ml-2 text-sm font-medium text-foreground sm:hidden">Unpayd</span>
                </header>
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
