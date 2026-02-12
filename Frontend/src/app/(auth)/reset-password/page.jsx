'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import AuthForm from '@/components/auth/AuthForm';
import FormInput from '@/components/auth/FormInput';
import FormButton from '@/components/auth/FormButton';
import { FiLock } from 'react-icons/fi';

function ResetPasswordForm() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  useEffect(() => {
    // Simple password strength calculation
    const password = formData.password;
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    // Length check
    if (password.length >= 8) strength += 1;
    // Contains number
    if (/\d/.test(password)) strength += 1;
    // Contains special character
    if (/[!@#$%^&*]/.test(password)) strength += 1;
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [formData.password]);

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-[var(--color-border)]';
    if (passwordStrength === 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-yellow-500';
    if (passwordStrength === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      Swal.fire({
        title: 'Error!',
        text: 'Passwords do not match',
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
      return;
    }

    if (formData.password.length < 6) {
      Swal.fire({
        title: 'Error!',
        text: 'Password must be at least 6 characters long',
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          title: 'Success!',
          text: data.message || 'Password reset successful',
          icon: 'success',
          confirmButtonColor: 'var(--color-button-primary)'
        }).then(() => {
          router.refresh();
          router.push('/login');
        });
      } else {
        Swal.fire({
          title: 'Error!',
          text: data.error || 'Failed to reset password',
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to reset password',
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
      title="Reset Password"
      subtitle="Create a new password for your account"
      footerLink={{ href: '/login', text: 'Back to Login' }}
    >
      <div className="space-y-4">
        <div>
          <FormInput 
            type={showPassword ? 'text' : 'password'}
            placeholder="New Password"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            required
            icon={<FiLock className="text-[var(--color-text-secondary)]" />}
            showPasswordToggle
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
          />
          
          {formData.password && (
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <div className="flex space-x-1">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i}
                      className={`h-1 w-6 rounded-sm ${i < passwordStrength ? getStrengthColor() : 'bg-[var(--color-border)]'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">{getStrengthLabel()}</span>
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                Use at least 8 characters with letters, numbers and symbols for a strong password
              </div>
            </div>
          )}
        </div>
        
        <FormInput 
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
          required
          icon={<FiLock className="text-[var(--color-text-secondary)]" />}
          showPasswordToggle
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
      </div>
      
      <div className="mt-6">
        <FormButton 
          type="submit"
          isLoading={isLoading}
        >
          Reset Password
        </FormButton>
      </div>
    </AuthForm>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen bg-[var(--color-bg-primary)]">
        <div className="animate-pulse space-y-4 bg-[var(--color-bg-card)] p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="h-8 bg-[var(--color-border)] rounded w-1/2 mx-auto"></div>
          <div className="h-4 bg-[var(--color-border)] rounded w-3/4 mx-auto"></div>
          <div className="h-10 bg-[var(--color-border)] rounded"></div>
          <div className="h-10 bg-[var(--color-border)] rounded"></div>
          <div className="h-10 bg-[var(--color-border)] rounded"></div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}