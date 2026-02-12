import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { AuthProvider } from '../components/context/AuthContext';
import Navbar from '@/components/Navbar';

// Use GeistSans instead of Inter
// const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'BookCafe | Your Digital Educational Library',
  description: 'BookCafe is an educational platform for students and teachers to discover, read, and learn with our extensive collection of digital books.',
  keywords: 'books, education, digital library, learning, reading, students, teachers',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <AuthProvider>
          <Navbar />
          <main className="pt-0">  
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}