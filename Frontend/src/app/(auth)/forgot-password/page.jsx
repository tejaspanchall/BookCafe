'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import AuthForm from '@/components/auth/AuthForm';
import FormInput from '@/components/auth/FormInput';
import FormButton from '@/components/auth/FormButton';
import { FiMail } from 'react-icons/fi';

export default function ForgotPassword() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');
  const router = useRouter();

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setEmailError('');
    
    // Validate email
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include'
      });
      
      const data = await res.json();
      console.log('Response:', data);
      
      if (res.ok) {
        setIsSubmitted(true);
      } else {
        let errorMessage = data.error || data.message || 'Failed to send reset instructions';
        console.error('Error details:', data);
        
        Swal.fire({
          title: 'Error!!',
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Swal.fire({
        title: 'Error!!!',
        text: 'Network error. Please check your connection and try again.',
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthForm 
        title="Check Your Email"
        subtitle={`We've sent password reset instructions to ${email}`}
        footerLink={{ href: '/login', text: 'Back to Login' }}
      >
        <div className="text-center mb-4">
          <div className="flex justify-center mb-6">
            <div className="bg-[var(--color-success-light)] p-4 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-[var(--color-text-primary)] mb-4">
            We've sent password reset instructions to <span className="font-medium">{email}</span>.
          </p>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Follow the instructions in the email to reset your password. If you don't see the email, check your spam folder.
            The link will expire in 1 hour for security reasons.
          </p>
        </div>
        
        <FormButton 
          type="button"
          onClick={() => router.push('/login')}
        >
          Return to Login
        </FormButton>
      </AuthForm>
    );
  }

  return (
    <AuthForm 
      onSubmit={handleSubmit} 
      title="Forgot Password"
      subtitle="Enter your email and we'll send you a link to reset your password"
      footerLink={{ href: '/login', text: 'Back to Login' }}
    >
      <div className="space-y-6">
        <div>
          <FormInput 
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            required
            icon={<FiMail className="text-[var(--color-text-secondary)]" />}
            error={emailError}
          />
          {emailError && (
            <p className="text-red-500 text-sm mt-1">{emailError}</p>
          )}
        </div>
      
        <FormButton 
          type="submit"
          isLoading={isLoading}
        >
          Send Reset Link
        </FormButton>
      </div>
    </AuthForm>
  );
}