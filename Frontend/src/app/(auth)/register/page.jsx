'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import AuthForm from '@/components/auth/AuthForm';
import FormInput from '@/components/auth/FormInput';
import FormButton from '@/components/auth/FormButton';
import { FiUser, FiMail, FiLock, FiUserCheck } from 'react-icons/fi';

export default function Register() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const router = useRouter();
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    email: '',
    confirmEmail: '',
    password: '',
    role: 'student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.email !== form.confirmEmail) {
      Swal.fire({
        title: 'Error!',
        text: 'Emails do not match',
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
      return;
    }

    const required = ['firstname', 'lastname', 'email', 'password', 'role'];
    for (const field of required) {
      if (!form[field]) {
        Swal.fire({
          title: 'Error!',
          text: `Missing required field: ${field}`,
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
        return;
      }
    }
  
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          firstname: form.firstname,
          lastname: form.lastname,
          email: form.email,
          password: form.password,
          role: form.role
        }),
      });
  
      const data = await res.json();
      
      if (res.ok) {
        Swal.fire({
          title: 'Success!',
          text: 'Registration successful! Please login',
          icon: 'success',
          confirmButtonColor: 'var(--color-button-primary)'
        }).then(() => {
          router.refresh();
          router.push('/login');
        });
      } else {
        Swal.fire({
          title: 'Error!',
          text: data.message || data.error || 
                (data.errors ? Object.values(data.errors).flat().join('\n') : 'Registration failed'),
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
      }
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
      title="Create Account"
      subtitle="Join BookCafe today"
      footerLink={{ href: '/login', text: 'Already have an account? Sign in' }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput 
            type="text"
            placeholder="First Name"
            value={form.firstname}
            onChange={e => setForm({...form, firstname: e.target.value})}
            required
            icon={<FiUser className="text-[var(--color-text-secondary)]" />}
          />
          
          <FormInput 
            type="text"
            placeholder="Last Name"
            value={form.lastname}
            onChange={e => setForm({...form, lastname: e.target.value})}
            required
          />
        </div>

        <div className="relative">
          <select 
            className="w-full px-4 py-3 pl-10 border border-[var(--color-border)] rounded-lg
                      text-[var(--color-text-primary)] bg-[var(--color-bg-input)] 
                      focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:border-transparent
                      transition-colors duration-200 appearance-none"
            value={form.role}
            onChange={e => setForm({...form, role: e.target.value})}
            required
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiUserCheck className="text-[var(--color-text-secondary)]" />
          </div>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-[var(--color-text-secondary)]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <FormInput 
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm({...form, email: e.target.value})}
          required
          icon={<FiMail className="text-[var(--color-text-secondary)]" />}
        />

        <FormInput 
          type="email"
          placeholder="Confirm Email"
          value={form.confirmEmail}
          onChange={e => setForm({...form, confirmEmail: e.target.value})}
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
        
        <div className="text-xs text-[var(--color-text-secondary)]">
          Password must be at least 6 characters long
        </div>
      </div>

      <div className="pt-2">
        <FormButton 
          type="submit" 
          isLoading={isLoading}
        >
          Create Account
        </FormButton>
      </div>
    </AuthForm>
  );
}