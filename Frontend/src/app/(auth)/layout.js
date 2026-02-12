'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthLayout({ children }) {
  const router = useRouter();
  
  useEffect(() => {
    // If user is already logged in, redirect to catalog
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/catalog');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {children}
    </div>
  );
} 