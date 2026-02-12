'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import AuthForm from '@/components/auth/AuthForm';
import FormInput from '@/components/auth/FormInput';
import FormButton from '@/components/auth/FormButton';
import { FiMail, FiLock } from 'react-icons/fi';

export default function Login() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.email || !form.password) {
      Swal.fire({
        title: 'Error!',
        text: 'All fields are required',
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await res.json();
      
      if (!res.ok) {
        Swal.fire({
          title: 'Error!',
          text: data.error || 'Login failed',
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('loginStateChange'));
      router.refresh();
      router.push('/catalog');
      
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to connect to server',
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthForm 
      onSubmit={handleSubmit} 
      title="Welcome Back"
      subtitle="Sign in to continue to BookCafe"
      footerLink={{ 
        href: '/register', 
        text: "Don't have an account? Sign up" 
      }}
    >
      <div className="space-y-4">
        <FormInput
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm({...form, email: e.target.value})}
          required
          icon={<FiMail className="text-[var(--color-text-secondary)]" />}
        />

        <FormInput
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          required
          icon={<FiLock className="text-[var(--color-text-secondary)]" />}
          showPasswordToggle
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
        
        <div className="text-right">
          <a href="/forgot-password" className="text-sm text-[var(--color-link)] hover:underline transition-all duration-200">
            Forgot Password?
          </a>
        </div>
      </div>
      
      <div className="pt-2">
        <FormButton 
          type="submit" 
          isLoading={isLoading}
        >
          Sign In
        </FormButton>
      </div>
    </AuthForm>
  );
}
