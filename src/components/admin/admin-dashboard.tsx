
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { VerificationsChart } from './verifications-chart';
import { RecentActivityTable } from './recent-activity-table';
import { ChainIntegrityChecker } from './chain-integrity-checker';
import { ShieldX, AlertTriangle, RefreshCw } from 'lucide-react';
import { tamperChain } from '@/ai/flows/tamper-chain';
import { resetChainFlow } from '@/ai/flows/reset-chain';
import { ForgeryAlerts } from './forgery-alerts';
import { addEntityToBlacklist } from '@/lib/firestore-db';


export function AdminDashboard() {
  const { toast } = useToast();
  const [entityToBlacklist, setEntityToBlacklist] = useState('');

  const handleBlacklist = async () => {
    if (!entityToBlacklist.trim()) {
        toast({
            variant: "destructive",
            title: 'Input Required',
            description: 'Please enter an entity ID to blacklist.',
        });
        return;
    }
    try {
        await addEntityToBlacklist(entityToBlacklist.trim(), "Blacklisted by admin");
        toast({
          title: 'Entity Blacklisted',
          description: `'${entityToBlacklist.trim()}' has been successfully added to the blacklist.`,
        });
        setEntityToBlacklist('');
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: 'Error Blacklisting Entity',
            description: error.message || 'An unexpected error occurred.',
        });
    }
  };

  const handleTamper = async () => {
    try {
      const result = await tamperChain();
       toast({
        variant: "destructive",
        title: 'Tampering Simulated',
        description: result.message,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: 'Error',
        description: 'Failed to simulate tampering.',
      });
    }
  };

  const handleResetChain = async () => {
    try {
      const result = await resetChainFlow();
      toast({
        title: 'Chain Reset Successfully',
        description: result.message,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reset the chain.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="Monitor verification trends and manage system security."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Verifications</CardTitle>
            <CardDescription>All-time verification attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">1,258</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valid Certificates</CardTitle>
            <CardDescription>Percentage of successful verifications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">92.3%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Forgeries Detected</CardTitle>
            <CardDescription>Number of invalid certificates found</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-red-600">97</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Verification Trends</CardTitle>
            <CardDescription>Verification activity over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <VerificationsChart />
          </CardContent>
        </Card>
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Forgery Alerts</CardTitle>
              <CardDescription>Recent invalid verification attempts.</CardDescription>
            </CardHeader>
            <CardContent>
              <ForgeryAlerts />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Chain Integrity</CardTitle>
                <CardDescription>Verify the integrity of the certificate hash chain.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChainIntegrityChecker />
            </CardContent>
           </Card>
           <Card>
              <CardHeader>
                <CardTitle>System Controls</CardTitle>
                <CardDescription>Manage and test the certificate chain.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Simulate Tampering
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will intentionally corrupt a random record in the chain to demonstrate
                        that the integrity check can detect it. This is for testing purposes only.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleTamper}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset Chain
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all
                        certificate records and start a new chain with only the genesis block.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetChain}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          <Card>
            <CardHeader>
              <CardTitle>Blacklist Entity</CardTitle>
              <CardDescription>Block an institution from the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Enter institution name..." 
                  value={entityToBlacklist}
                  onChange={(e) => setEntityToBlacklist(e.target.value)}
                />
                <Button onClick={handleBlacklist} variant="destructive">
                  <ShieldX className="mr-2 h-4 w-4" />
                  Blacklist
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivityTable />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
