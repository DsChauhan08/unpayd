'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuthenticationStatus, useUserData, useSignOut } from '@nhost/react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: ReturnType<typeof useUserData>;
    isLoading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthenticationStatus();
    const user = useUserData();
    const { signOut } = useSignOut();
    const router = useRouter();

    const logout = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
