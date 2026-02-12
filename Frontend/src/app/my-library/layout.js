import { cookies } from 'next/headers';

export async function generateMetadata() {
  try {
    // Since this is a server component and user data is stored in localStorage on client,
    // we need to get it from cookies if available
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie || !userCookie.value) {
      return {
        title: 'My Library',
        description: 'Access your personal collection of saved books and reading history.',
        keywords: 'personal library, saved books, reading history, bookmarks',
      };
    }
    
    let userData;
    try {
      userData = JSON.parse(decodeURIComponent(userCookie.value));
    } catch (e) {
      return {
        title: 'My Library',
        description: 'Access your personal collection of saved books and reading history.',
        keywords: 'personal library, saved books, reading history, bookmarks',
      };
    }
    
    const userName = userData.firstname || 'My';
    
    return {
      title: `${userName}'s Library`,
      description: `Access ${userName}'s personal collection of saved books and reading history.`,
      keywords: 'personal library, saved books, reading history, bookmarks',
    };
  } catch (error) {
    return {
      title: 'My Library',
      description: 'Access your personal collection of saved books and reading history.',
      keywords: 'personal library, saved books, reading history, bookmarks',
    };
  }
}

export default function MyLibraryLayout({ children }) {
  return children;
} 