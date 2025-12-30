'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { nhost } from '@/lib/nhost';
import { GET_CHATS } from '@/lib/graphql';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
} from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus,
    Search,
    MessageSquare,
    Archive,
    Trash2,
    MoreHorizontal,
    ChevronDown,
    LogOut,
    Settings,
    User,
} from 'lucide-react';
import { UnpaydLogo } from '@/components/ui/logo';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ChatItem {
    id: string;
    title: string | null;
    model: string;
    updatedAt: Date;
}

interface ChatSidebarProps {
    onNewChat?: () => void;
}

export function ChatSidebar({ onNewChat }: ChatSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout, isAuthenticated } = useAuth();
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    const fetchChats = async () => {
        if (!isAuthenticated) return;
        try {
            const data: any = await nhost.graphql.request(GET_CHATS);
            const mappedChats = data.chats.map((c: any) => ({
                id: c.id,
                title: c.title,
                model: c.model,
                updatedAt: new Date(c.updated_at)
            }));
            setChats(mappedChats);
        } catch (error) {
            console.error('Failed to fetch chats:', error);
        }
    };

    useEffect(() => {
        fetchChats();
        // Poll for updates every 10 seconds? Or just on mount/path change?
        // Path change might indicate a new chat created
        if (pathname === '/chat' || pathname.startsWith('/chat/')) {
            fetchChats();
        }
    }, [isAuthenticated, pathname]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const formatDate = (date: Date) => {
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const groupChatsByDate = (chatList: ChatItem[]) => {
        const groups: { [key: string]: ChatItem[] } = {};

        chatList.forEach((chat) => {
            const date = new Date(chat.updatedAt);
            const key = formatDate(date);
            if (!groups[key]) groups[key] = [];
            groups[key].push(chat);
        });

        return groups;
    };

    const filteredChats = chats.filter(chat =>
        (chat.title?.toLowerCase() || 'new chat').includes(searchQuery.toLowerCase())
    );

    const groupedChats = groupChatsByDate(filteredChats);

    return (
        <Sidebar className="border-r border-zinc-800 bg-zinc-950">
            <SidebarHeader className="p-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 mb-4">
                    <UnpaydLogo size="sm" showText={true} />
                </Link>

                {/* New Chat Button */}
                <Button
                    onClick={onNewChat}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white justify-start gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Chat
                </Button>

                {/* Search */}
                <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search chats..."
                        className="pl-9 bg-zinc-900 border-zinc-800 focus:border-zinc-700"
                    />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <ScrollArea className="flex-1">
                    {/* Chat History */}
                    {Object.entries(groupedChats).map(([date, chatGroup]) => (
                        <SidebarGroup key={date}>
                            <SidebarGroupLabel className="text-zinc-500 text-xs uppercase tracking-wider">
                                {date}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {chatGroup.map((chat) => (
                                        <SidebarMenuItem key={chat.id}>
                                            <div className="flex items-center group">
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={pathname === `/chat/${chat.id}`}
                                                    className="flex-1 truncate"
                                                >
                                                    <Link href={`/chat/${chat.id}`}>
                                                        <MessageSquare className="w-4 h-4 shrink-0" />
                                                        <span className="truncate">
                                                            {chat.title || 'New Chat'}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuButton>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                                                        >
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                                        <DropdownMenuItem
                                                            className="text-zinc-400"
                                                        >
                                                            <Archive className="w-4 h-4 mr-2" />
                                                            Archive
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-400"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}

                    {/* Empty state */}
                    {chats.length === 0 && (
                        <div className="p-4 text-center text-zinc-500 text-sm">
                            No chats yet. Start a new conversation!
                        </div>
                    )}
                </ScrollArea>
            </SidebarContent>

            <SidebarFooter className="p-4 border-t border-zinc-800">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 hover:bg-zinc-800"
                        >
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                <User className="w-4 h-4 text-zinc-300" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-white truncate">
                                    {user?.displayName || user?.email || 'User'}
                                </p>
                                {user?.email && (
                                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                                )}
                            </div>
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        side="top"
                        className="w-56 bg-zinc-900 border-zinc-800"
                    >
                        <DropdownMenuItem className="text-zinc-400">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-800" />
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="text-red-400"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
