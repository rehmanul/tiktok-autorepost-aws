'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/auth-provider';

interface RecentPost {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  tiktokUrl: string;
  tiktokHandle: string;
  repostUrl: string | null;
  destinationPlatform: 'INSTAGRAM' | 'YOUTUBE' | 'TWITTER';
  destinationHandle: string;
  caption: string;
  publishedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  SUCCEEDED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800'
};

const PLATFORM_NAMES = {
  INSTAGRAM: 'Instagram',
  YOUTUBE: 'YouTube',
  TWITTER: 'Twitter',
  TIKTOK: 'TikTok'
};

export default function RecentPostsPage() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<RecentPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/activity/recent-posts`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load recent posts');
      }

      const data = await response.json();
      setPosts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recent Posts</h1>
            <p className="text-muted-foreground mt-1">
              View the status of all auto-posted content
            </p>
          </div>
          <Button onClick={loadPosts} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Posts List */}
        {!isLoading && posts.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>No posts yet. Create an automation rule to start auto-posting!</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {PLATFORM_NAMES[post.destinationPlatform]} Repost
                      </CardTitle>
                      <CardDescription>
                        From @{post.tiktokHandle} → @{post.destinationHandle}
                      </CardDescription>
                    </div>
                    <Badge className={STATUS_COLORS[post.status]}>
                      {post.status === 'SUCCEEDED' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {post.status === 'FAILED' && <XCircle className="h-3 w-3 mr-1" />}
                      {post.status === 'IN_PROGRESS' && <Clock className="h-3 w-3 mr-1 animate-spin" />}
                      {post.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                      {post.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Caption */}
                  <div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.caption}
                    </p>
                  </div>

                  {/* Links */}
                  <div className="flex flex-wrap gap-3">
                    {/* TikTok Source */}
                    <a
                      href={post.tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Original on TikTok
                    </a>

                    {/* Repost URL */}
                    {post.repostUrl && (
                      <a
                        href={post.repostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on {PLATFORM_NAMES[post.destinationPlatform]}
                      </a>
                    )}
                  </div>

                  {/* Error Message */}
                  {post.status === 'FAILED' && post.errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> {post.errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Published: {new Date(post.publishedAt).toLocaleString()}</span>
                    {post.completedAt && (
                      <span>Completed: {new Date(post.completedAt).toLocaleString()}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
