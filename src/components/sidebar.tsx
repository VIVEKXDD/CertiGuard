
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  PanelLeft,
  ShieldCheck,
  LayoutDashboard,
  FilePlus,
  ScanLine,
  LogOut,
} from 'lucide-react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import type { Role } from '@/lib/types';

// Sidebar context and provider
const SidebarContext = React.createContext<{
  state: 'expanded' | 'collapsed';
  isMobile: boolean;
  toggleSidebar: () => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
} | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }
  return context;
}

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(true);
  const [openMobile, setOpenMobile] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    isMobile ? setOpenMobile((v) => !v) : setOpen((v) => !v);
  }, [isMobile]);

  const state = open ? 'expanded' : 'collapsed';

  return (
    <SidebarContext.Provider
      value={{ state, isMobile, toggleSidebar, openMobile, setOpenMobile }}
    >
      <TooltipProvider delayDuration={0}>
        <div
          ref={ref}
          className={cn(
            'flex min-h-screen w-full',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
});
SidebarProvider.displayName = 'SidebarProvider';

// Navigation items configuration
const navItems: Record<Role, { href: string; icon: React.ElementType; label: string }[]> = {
  Admin: [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  ],
  Institution: [
    { href: '/institution', icon: FilePlus, label: 'Issue Certificate' },
  ],
  Verifier: [
    { href: '/verifier', icon: ScanLine, label: 'Verify' },
  ],
};

// Main Sidebar Component
export function Sidebar() {
  const { user, logout } = useAuth();
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();

  const renderNavItems = () => {
    if (!user?.role) return null;
    const items = navItems[user.role];
    if (!items) return null;

    return items.map((item) => (
      <li key={item.href}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={item.href}>
              <Button
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5" />
                <span
                  className={cn(
                    'truncate transition-opacity duration-200',
                    state === 'collapsed' && !isMobile ? 'opacity-0' : 'opacity-100'
                  )}
                >
                  {item.label}
                </span>
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="center"
            hidden={state !== 'collapsed' || isMobile}
          >
            {item.label}
          </TooltipContent>
        </Tooltip>
      </li>
    ));
  };
  
  const content = (
    <>
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <span
          className={cn(
            'font-headline text-xl font-bold text-primary truncate transition-opacity duration-200',
            state === 'collapsed' && !isMobile ? 'opacity-0' : 'opacity-100'
          )}
        >
          CertGuard
        </span>
      </div>
      <nav className="flex-1 p-2">
        <ul className="space-y-1">{renderNavItems()}</ul>
      </nav>
      <div className="mt-auto border-t p-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              <span
                className={cn(
                  'truncate transition-opacity duration-200',
                  state === 'collapsed' && !isMobile ? 'opacity-0' : 'opacity-100'
                )}
              >
                Sign Out
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="center"
            hidden={state !== 'collapsed' || isMobile}
          >
            Sign Out
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-card text-card-foreground transition-[width] duration-300',
        state === 'expanded' ? 'w-64' : 'w-16'
      )}
    >
      {content}
    </aside>
  );
}
