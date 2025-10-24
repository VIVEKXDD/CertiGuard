'use client';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, ShieldCheck } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:justify-end">
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            {/* The Sidebar component is not designed to be responsive, so we can't reuse it directly.
                Instead, we'll build a simplified version for mobile. */}
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center gap-2 border-b px-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <span className="font-headline text-xl font-bold text-primary">
                  CertGuard
                </span>
              </div>
              <div className="flex-1">
                {/* Mobile nav links can be added here */}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
       <div className="hidden md:block">
        <ThemeToggle />
      </div>
    </header>
  );
}
