
'use client';
import {
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Home, Info, LogOut, Award, Flame, PanelLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useSidebar } from '@/hooks/use-sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  
  // Conditionally render layout to avoid hook errors on pages without the provider
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // This hook will now only be called on pages with the sidebar provider
  const { setOpen } = useSidebar();
  
  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between">
             <h1 className="text-xl font-semibold text-primary">Personal Notes</h1>
          </div>
        </SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/'}>
              <Link href="/">
                <Home />
                Personal Notes
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/about'}>
              <Link href="/about">
                <Info />
                About
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarFooter>
          <Separator className="my-2" />
           <div className="flex items-center justify-around p-2">
            <ThemeToggle />
             {user && (
              <Button variant="ghost" onClick={handleLogout} size="icon" aria-label="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger className="md:hidden">
                <PanelLeft />
            </SidebarTrigger>
            <div className="flex-grow"></div>
            <div className="flex items-center gap-4">
                 {/* This space can be used for stats on the homepage if we move them here */}
            </div>
        </header>
        {children}
      </SidebarInset>
    </>
  );
}
