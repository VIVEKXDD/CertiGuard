'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, ShieldAlert, Zap } from 'lucide-react';
import { verifyChain } from '@/ai/flows/verify-chain-integrity';
import { cn } from '@/lib/utils';

export function ChainIntegrityChecker() {
  const [result, setResult] = useState<{ isValid: boolean; log: string[] } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckIntegrity = async () => {
    setIsChecking(true);
    setResult(null);
    try {
      const response = await verifyChain();
      setResult(response);
    } catch (error) {
      console.error('Failed to verify chain integrity:', error);
      setResult({
        isValid: false,
        log: ['An unexpected error occurred while running the check.'],
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleCheckIntegrity} disabled={isChecking} className="w-full">
        {isChecking ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Run Integrity Check
          </>
        )}
      </Button>
      {result && (
        <Card className={cn(
            "border-2 transition-all",
            result.isValid ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              {result.isValid ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-red-600" />
              )}
              <h4 className={cn(
                "font-semibold",
                result.isValid ? "text-green-700" : "text-red-700"
              )}>
                {result.isValid ? 'Chain Integrity Verified' : 'Chain Integrity Compromised'}
              </h4>
            </div>
            <ScrollArea className="h-32 w-full rounded-md border bg-background p-2">
              <div className="text-xs font-mono whitespace-pre-wrap">
                {result.log.join('\n')}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
