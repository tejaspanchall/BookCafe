'use client';

import { useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/components/context/AuthContext';

export default function AddMultipleBooksLayout({ children }) {
  const { token, isTeacher } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.push('/login');
    } else if (!isTeacher()) {
      router.push('/');
    }
  }, [token, isTeacher, router]);

  return token && isTeacher() ? children : null;
} 