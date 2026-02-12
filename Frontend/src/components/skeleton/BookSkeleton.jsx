import Skeleton from './Skeleton';
import { PlusCircle, PencilSquare, Trash, ArrowLeft, Book, Person, Tag, CurrencyDollar, InfoCircle, Calendar } from 'react-bootstrap-icons';

export default function BookSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button Skeleton */}
      <div className="mb-6">
        <div className="inline-flex items-center py-2 px-4 rounded border border-gray-200 bg-white">
          <ArrowLeft className="text-gray-400 mr-2" size={16} />
          <Skeleton className="w-28 h-5 rounded-md" />
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Left column: Book cover and actions */}
        <div className="lg:w-1/3 xl:w-1/4 flex flex-col items-center lg:items-start">
          {/* Book cover with border */}
          <div className="w-72 max-w-full aspect-[2/3] rounded-md shadow-md mb-6 border border-gray-200 bg-white p-2">
            <div className="relative w-full h-full overflow-hidden rounded-sm">
              {/* 3D Effect Shadow */}
              <div className="absolute inset-y-0 right-0 w-3 z-10 bg-gradient-to-l from-black/20 to-transparent"></div>
              <div className="absolute inset-x-0 bottom-0 h-3 z-10 bg-gradient-to-t from-black/30 to-transparent"></div>
              
              <Skeleton className="w-full h-full object-cover rounded-sm" />
              
              {/* Price Tag Skeleton */}
              <div className="absolute bottom-3 right-3 z-20">
                <Skeleton 
                  className="px-2 py-1 rounded-full text-xs font-bold shadow-md" 
                  style={{ 
                    backgroundColor: "rgba(var(--color-primary-rgb), 0.2)",
                    width: '2.5rem',
                    height: '1.25rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="w-full max-w-xs space-y-3">
            {/* Add to library button */}
            <Skeleton 
              className="w-full py-2.5 px-4 rounded flex items-center justify-center" 
              style={{ backgroundColor: "#1f2937", opacity: 0.2 }}
            >
              <div className="flex items-center justify-center gap-2 opacity-0">
                <PlusCircle size={16} />
                <span>Add to Library</span>
              </div>
            </Skeleton>
            
            {/* Edit button */}
            <Skeleton 
              className="w-full py-2.5 px-4 rounded flex items-center justify-center" 
              style={{ backgroundColor: "#f3f4f6", opacity: 0.5 }}
            >
              <div className="flex items-center justify-center gap-2 opacity-0">
                <PencilSquare size={16} />
                <span>Edit Book</span>
              </div>
            </Skeleton>
            
            {/* Delete button */}
            <Skeleton 
              className="w-full py-2.5 px-4 rounded flex items-center justify-center" 
              style={{ backgroundColor: "#f3f4f6", opacity: 0.5 }}
            >
              <div className="flex items-center justify-center gap-2 opacity-0">
                <Trash size={16} />
                <span>Delete Book</span>
              </div>
            </Skeleton>
          </div>
          
          {/* Mobile metadata card skeleton */}
          <div className="mt-8 lg:hidden w-full p-5 bg-white border border-gray-200 rounded-lg">
            <Skeleton className="h-6 w-36 mb-3 pb-2" />
            <div className="space-y-4">
              {/* ISBN */}
              <div className="flex items-start">
                <Book className="flex-shrink-0 mt-1 mr-3 text-gray-300" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </div>
              
              {/* Author */}
              <div className="flex items-start">
                <Person className="flex-shrink-0 mt-1 mr-3 text-gray-300" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-5 w-40" />
                </div>
              </div>
              
              {/* Categories */}
              <div className="flex items-start">
                <Tag className="flex-shrink-0 mt-1 mr-3 text-gray-300" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-20 mb-1" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
              
              {/* Price */}
              <div className="flex items-start">
                <CurrencyDollar className="flex-shrink-0 mt-1 mr-3 text-gray-300" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column: Book details */}
        <div className="lg:w-2/3 xl:w-3/4">
          {/* Title skeleton */}
          <div className="mb-6">
            <Skeleton className="h-9 w-3/4 mb-2" />
          </div>
          
          {/* Categories tags skeleton */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Skeleton 
              className="h-7 w-24 rounded-full" 
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            />
            <Skeleton 
              className="h-7 w-32 rounded-full" 
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            />
            <Skeleton 
              className="h-7 w-28 rounded-full" 
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            />
          </div>
          
          {/* Description section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <InfoCircle size={18} className="text-gray-400" />
              <Skeleton className="h-6 w-32" />
            </div>
            
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          </div>
          
          {/* Desktop metadata section - hidden on mobile */}
          <div className="hidden lg:block mt-10 p-6 bg-white border border-gray-200 rounded-lg">
            <Skeleton className="h-6 w-36 mb-5" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ISBN */}
              <div className="flex items-start">
                <Book className="flex-shrink-0 mt-1 mr-3 text-gray-300" />
                <div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
              
              {/* Author */}
              <div className="flex items-start">
                <Person className="flex-shrink-0 mt-1 mr-3 text-gray-300" />
                <div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-5 w-40" />
                </div>
              </div>
              
              {/* Categories */}
              <div className="flex items-start">
                <Tag className="flex-shrink-0 mt-1 mr-3 text-gray-300" />
                <div>
                  <Skeleton className="h-3 w-20 mb-1" />
                  <Skeleton className="h-5 w-40" />
                </div>
              </div>
              
              {/* Price */}
              <div className="flex items-start">
                <CurrencyDollar className="flex-shrink-0 mt-1 mr-3 text-gray-300" />
                <div>
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 