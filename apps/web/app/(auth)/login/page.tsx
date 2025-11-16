'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Repeat } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/console');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 shadow-2xl border-0">
        <CardContent className="pt-12 pb-10 px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-3xl mb-6 shadow-lg">
              <Repeat className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              TikTok Auto Repost
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Sign in to your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-200">
                <p className="font-medium">Login Failed</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                disabled={isSubmitting || isLoading}
                autoComplete="email"
                className="h-12 text-base border-2 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium text-gray-700 dark:text-gray-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                disabled={isSubmitting || isLoading}
                autoComplete="current-password"
                className="h-12 text-base border-2 focus:border-purple-500 transition-colors"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 mt-8"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3">
                  <div className="h-5 w-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

