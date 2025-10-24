
'use client';

import { useState, useEffect } from 'react';
import { getForgeryAlerts } from '@/lib/firestore-db';
import type { VerificationLog } from '@/lib/firestore-db';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export function ForgeryAlerts() {
  const [alerts, setAlerts] = useState<VerificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const forgeryAlerts = await getForgeryAlerts(5); // Get latest 5 alerts
      setAlerts(forgeryAlerts);
    } catch (error) {
      console.error('Failed to fetch forgery alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div className="space-y-4">
       <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={isLoading} className="w-full">
         <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
         Refresh Alerts
       </Button>
      {isLoading ? (
         <div className="flex items-center justify-center h-24">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
         </div>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-center text-muted-foreground py-4">No forgery alerts found. The system is secure.</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Alert key={index} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold">
                Invalid verification for ID: {alert.certificateId}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {alert.reason} -
                <span className="ml-1 font-medium">
                  {alert.timestamp ? formatDistanceToNow(new Date(alert.timestamp.seconds * 1000)) : ''} ago
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}
