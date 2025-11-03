'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';

export default function HomePage() {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated) {
                router.push('/console');
            } else {
                router.push('/login');
            }
        }
    }, [isLoading, isAuthenticated, router]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
        </div>
    );
}
