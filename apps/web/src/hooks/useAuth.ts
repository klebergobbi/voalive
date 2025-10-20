import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';

export function useAuth(requireAuth: boolean = false) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (!requireAuth && isAuthenticated && (pathname === '/login' || pathname === '/register')) {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect') || '/';
        router.push(redirect);
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, router, pathname]);

  return {
    user,
    isAuthenticated,
    isLoading,
  };
}
