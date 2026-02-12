import Skeleton from './Skeleton';

export default function CardSkeleton({ count = 5, layout = 'catalog', showStats = false, showFilters = false }) {
  // Create an array with the specified count
  const skeletons = Array(count).fill(0);
  
  // Grid layout based on prop (landing page, catalog page, or my-library)
  const gridClass = layout === 'landing' 
    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3" 
    : layout === 'my-library'
      ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5"
      : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3";
  
  return (
    <>
      {/* Stats Cards Skeleton for My Library */}
      {showStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 mb-8">
          {/* Total Books Stat */}
          <div 
            className="p-4 rounded-lg shadow-sm flex items-center gap-4"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)' }}>
              <Skeleton className="w-6 h-6" />
            </div>
            <div>
              <Skeleton className="h-6 w-16 mb-1" />
              <Skeleton className="h-3 w-20 opacity-80" />
            </div>
          </div>

          {/* Categories Stat */}
          <div 
            className="p-4 rounded-lg shadow-sm flex items-center gap-4"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <Skeleton className="w-6 h-6" />
            </div>
            <div>
              <Skeleton className="h-6 w-16 mb-1" />
              <Skeleton className="h-3 w-20 opacity-80" />
            </div>
          </div>

          {/* Authors Stat */}
          <div 
            className="p-4 rounded-lg shadow-sm flex items-center gap-4"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <Skeleton className="w-6 h-6" />
            </div>
            <div>
              <Skeleton className="h-6 w-16 mb-1" />
              <Skeleton className="h-3 w-20 opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Controls Skeleton */}
      {showFilters && (
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Skeleton 
              className="w-full h-11 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            />
          </div>
          <div className="flex gap-2">
            <Skeleton 
              className="w-40 h-11 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            />
            <Skeleton 
              className="w-20 h-11 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            />
          </div>
        </div>
      )}

      {/* Books Grid */}
      <div className={gridClass}>
        {skeletons.map((_, index) => (
          <div 
            key={index} 
            className="group relative h-full rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              transform: 'translateZ(0)',
            }}
          >
            {/* Cover Area - 3D Effect with Shadow */}
            <div className="relative overflow-hidden">
              {/* 3D Effect Shadow */}
              <div className="absolute inset-y-0 right-0 w-3 z-10 bg-gradient-to-l from-black/20 to-transparent"></div>
              <div className="absolute inset-x-0 bottom-0 h-3 z-10 bg-gradient-to-t from-black/30 to-transparent"></div>
              
              {/* Cover Image Skeleton */}
              <Skeleton className="w-full aspect-[2/3] object-cover" />

              {/* Price Tag - Modern Floating Design */}
              <div className="absolute bottom-2 right-2 z-20">
                <Skeleton 
                  className="px-2 py-0.5 rounded-full text-xs font-bold shadow-md backdrop-blur-sm" 
                  style={{ 
                    backgroundColor: 'rgba(var(--color-primary-rgb), 0.2)',
                    width: '2.5rem',
                    height: '1.25rem'
                  }}
                />
              </div>
            </div>

            {/* Content Area - Clean and Modern */}
            <div className="p-3">
              {/* Title */}
              <Skeleton className="h-4 w-full mb-1.5" />
              
              {/* Author */}
              <Skeleton className="h-3 w-2/3 mb-2 opacity-80" />

              {/* Categories - Horizontal Pills */}
              <div className="flex flex-wrap gap-1 mt-auto">
                <Skeleton 
                  className="h-3 w-14 rounded-full" 
                  style={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  }}
                />
                <Skeleton 
                  className="h-3 w-16 rounded-full" 
                  style={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  }}
                />
              </div>
            </div>

            {/* Hover Action Button with Animation */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
              <Skeleton 
                className="px-4 py-2 rounded-lg text-xs font-semibold shadow-xl" 
                style={{ 
                  backgroundColor: 'rgba(37, 99, 235, 0.7)',
                  width: '7rem',
                  height: '2rem'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
} 