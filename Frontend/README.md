# BookCafe Frontend

BookCafe is an educational platform designed for students and teachers to discover, read, and manage digital books. The application allows users to explore books across various categories, manage personal libraries, and for teachers to add and edit book content.

## Backend Repository

The backend for this project is available at: [BookCafe-Backend](https://github.com/tejaspanchall/BookCafe-Backend)

## Features

- 📚 Comprehensive book catalog with categories
- 📖 Detailed book pages with covers and descriptions
- 👤 User authentication (login, register, password reset)
- 🔍 Search and filter capabilities
- 💼 Personal library management for users
- 👨‍🏫 Teacher-specific features (add/edit books)
- 📊 Bulk book import via Excel templates
- 📱 Responsive design for all devices
- 🎨 Modern UI with Tailwind CSS
- ⚡ Fast page loads with Next.js App Router

## Technologies Used

- **Framework**: [Next.js 15.2.0](https://nextjs.org/) with App Router
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [React Bootstrap Icons](https://www.npmjs.com/package/react-bootstrap-icons)
- **Alerts**: [SweetAlert2](https://sweetalert2.github.io/)
- **Font**: [Geist](https://vercel.com/font)
- **State Management**: React Context API
- **Excel Processing**: [PhpSpreadsheet](https://phpspreadsheet.readthedocs.io/) (backend)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn package manager
- Backend API server ([BookCafe Backend](https://github.com/tejaspanchall/BookCafe-Backend))

## Getting Started

1. **Clone the repository:**
```bash
git clone https://github.com/tejaspanchall/BookCafe-Frontend.git
cd BookCafe-Frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Create a `.env.local` file in the root directory with the following variables:
```env
NEXT_PUBLIC_BACKEND=http://localhost:8000/api
```

4. **Start the backend server:**
Make sure you have the [backend server](https://github.com/tejaspanchall/BookCafe-Backend) running.

5. **Run the development server:**
```bash
npm run dev
```

6. **Access the application:**
Open your browser and visit `http://localhost:3000`

## License

This project is licensed under the MIT License - see the LICENSE file for details. 