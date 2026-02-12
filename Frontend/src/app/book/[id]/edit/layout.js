export async function generateMetadata({ params }) {
  try {
    const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
    const response = await fetch(`${BACKEND}/books/${params.id}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return {
        title: 'Edit Book',
        description: 'Edit book information and details in the BookCafe library.',
        keywords: 'edit book, update book, modify details',
      };
    }
    
    const book = await response.json();
    
    return {
      title: `Edit ${book.title}`,
      description: `Update information and details for "${book.title}" in the BookCafe library.`,
      keywords: `edit ${book.title}, update book, modify details, ${book.author}`,
    };
  } catch (error) {
    return {
      title: 'Edit Book',
      description: 'Edit book information and details in the BookCafe library.',
      keywords: 'edit book, update book, modify details',
    };
  }
}

export default function EditBookLayout({ children }) {
  return children;
} 