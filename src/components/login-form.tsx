'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogIn, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!email || !password || !role) {
      setError('Please fill in all fields.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const result = await login(email, password, role);

    if (result.success) {
      toast({
        title: 'Login Successful',
        description: `Welcome, ${result.user?.email}!`,
      });
    } else {
      setError(result.message);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="role">Select Your Role</Label>
        <Select onValueChange={(value: Role) => setRole(value)} value={role}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Institution">Institution</SelectItem>
            <SelectItem value="Verifier">Verifier</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="user@example.com" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input 
          id="password" 
          type="password" 
          placeholder="••••••••" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      {error && (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
                {error}
            </AlertDescription>
        </Alert>
      )}

      <Button 
        onClick={handleSubmit} 
        className="w-full bg-primary hover:bg-primary/90"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </>
        )}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        <p>Use password `password123` for any user.</p>
        <p>Emails: `admin@certguard.com`, `mit@edu`, `verifier@google.com`</p>
      </div>
    </div>
  );
}
