'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

const FormButton = ({ 
  type = 'submit', 
  children, 
  onClick,
  isLoading = false,
  disabled = false,
  className = '',
  variant = 'primary', // primary, secondary, outline
}) => {
  const getButtonStyle = () => {
    const baseStyle = `w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]
                      flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`;
    
    const variantStyles = {
      primary: `bg-[var(--color-button-primary)] text-white 
                hover:bg-[var(--color-button-hover)]`,
      secondary: `bg-[var(--color-button-secondary)] text-[var(--color-text-primary)]
                  hover:bg-[var(--color-button-secondary-hover)]`,
      outline: `bg-transparent border border-[var(--color-button-primary)] 
                text-[var(--color-button-primary)] hover:bg-[var(--color-button-primary)]
                hover:text-white`,
    };
    
    return `${baseStyle} ${variantStyles[variant]} ${className}`;
  };
  
  return (
    <button
      type={type}
      className={getButtonStyle()}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <LoadingSpinner size="w-5 h-5" />
      ) : (
        children
      )}
    </button>
  );
};

export default FormButton; 