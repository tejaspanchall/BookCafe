'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function AuthForm({ children, onSubmit, title, subtitle, footerLink, logo = true }) {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[var(--color-bg-primary)] to-[var(--color-bg-secondary)] py-12 px-4">
      <div className="bg-[var(--color-bg-card)] shadow-xl rounded-xl p-8 w-full max-w-md border border-[var(--color-border)] transition-all duration-300 hover:shadow-2xl">
        
        <h2 className="text-2xl font-bold mb-2 text-center text-[var(--color-text-primary)]">{title}</h2>
        
        {subtitle && (
          <p className="text-center text-[var(--color-text-secondary)] mb-6">{subtitle}</p>
        )}
        
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
        </form>
        
        {footerLink && (
          <div className="text-center mt-6">
            <Link 
              href={footerLink.href || footerLink.to} 
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-link)] transition-colors duration-200"
            >
              {footerLink.text}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}