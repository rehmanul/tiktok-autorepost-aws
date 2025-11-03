'use client';

import { useState } from 'react';
import { connectionsApi } from '@/lib/api/connections';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TikTokCookieModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  userId: string;
  onSuccess: (connectionId: string) => void;
}

export function TikTokCookieModal({
  open,
  onOpenChange,
  tenantId,
  userId,
  onSuccess,
}: TikTokCookieModalProps) {
  const [accountHandle, setAccountHandle] = useState('');
  const [cookies, setCookies] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!accountHandle.trim() || !cookies.trim()) {
      setError('Please provide both TikTok handle and cookies');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const result = await connectionsApi.connectTikTok({
        tenantId,
        userId,
        accountHandle: accountHandle.trim(),
        cookies: cookies.trim(),
      });

      onSuccess(result.connectionId);
      onOpenChange(false);
      
      // Reset form
      setAccountHandle('');
      setCookies('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect TikTok account';
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect TikTok Account</DialogTitle>
          <DialogDescription>
            TikTok doesn&apos;t provide OAuth. Connect using your browser cookies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="handle">TikTok Handle</Label>
            <Input
              id="handle"
              placeholder="@yourhandle"
              value={accountHandle}
              onChange={(e) => setAccountHandle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cookies">Browser Cookies (JSON)</Label>
            <Textarea
              id="cookies"
              placeholder='[{"name":"sessionid","value":"..."}]'
              value={cookies}
              onChange={(e) => setCookies(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>How to get cookies:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Login to TikTok in Chrome/Firefox</li>
                <li>Install &quot;Cookie Editor&quot; extension</li>
                <li>Click extension icon → Export → Copy JSON</li>
                <li>Paste the JSON array above</li>
              </ol>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConnecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Connect
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
