'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JournalBookmark, List, X, Person } from 'react-bootstrap-icons';
import { AuthContext } from '@/components/context/AuthContext';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setIsLoggedIn(true);
        setUserRole(user.role);
        setUserName(user);
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
      }
    };

    checkAuth();

    window.addEventListener('storage', checkAuth);
    window.addEventListener('loginStateChange', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('loginStateChange', checkAuth);
    };
  }, []);

  const handleLogout = async () => {
    logout();
    
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('loginStateChange'));

    router.refresh();
    setTimeout(() => router.push('/login'), 50);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-[var(--color-primary)] shadow-md py-4 sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-white flex items-center">
          <JournalBookmark className="mr-2 text-white" />
          <span className="text-white">Book</span>
          <span className="text-[var(--color-text-logo)]">Cafe</span>
        </Link>

        {/* Mobile menu button - only visible on small screens */}
        <button 
          className="md:hidden text-white focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
        </button>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center space-x-6">
          {isLoggedIn ? (
            <>
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-2 bg-[var(--color-text-secondary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-text-light)] transition duration-300"
              >
                <Person className="text-xl" />
                <span>Dashboard</span>
              </Link>
              <button 
                onClick={handleLogout} 
                className="text-white hover:text-[red] focus:outline-none transition duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-white hover:text-[var(--color-text-light)] transition duration-300">
                Login
              </Link>
              <Link href="/register" className="bg-[var(--color-text-secondary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-text-light)] hover:text-white transition duration-300">
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--color-primary)] border-t border-[rgba(255,255,255,0.1)] mt-4 py-4 fixed top-[60px] w-full left-0 shadow-md z-40">
          <div className="container mx-auto px-4">
            <div className="flex flex-col space-y-4">
              {isLoggedIn ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="flex items-center space-x-2 bg-[var(--color-text-secondary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-text-light)] transition duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Person className="text-xl" />
                    <span>Dashboard</span>
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="text-white hover:text-[red] focus:outline-none transition duration-300 text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="text-white hover:text-[var(--color-text-light)] transition duration-300 block py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    href="/register" 
                    className="bg-[var(--color-text-secondary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-text-light)] hover:text-white transition duration-300 inline-block"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}