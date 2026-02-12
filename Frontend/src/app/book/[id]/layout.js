import { headers } from 'next/headers';

export async function generateMetadata({ params }) {
  try {
    const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
    const response = await fetch(`${BACKEND}/books/${params.id}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return {
        title: 'Book Details',
        description: 'View detailed information about this educational book including description, author, and reviews.',
      };
    }
    
    const book = await response.json();
    
    return {
      title: `${book.title}`,
      description: book.description ? 
        `${book.description.substring(0, 155)}...` : 
        'View detailed information about this educational book including description, author, and reviews.',
      keywords: `${book.title}, ${book.author}, book details, educational resource, reading material`,
    };
  } catch (error) {
    return {
      title: 'Book Details',
      description: 'View detailed information about this educational book including description, author, and reviews.',
    };
  }
}

export default function BookDetailLayout({ children }) {
  return children;
} 