'use client';

const FormInput = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  required = false,
  icon,
  showPasswordToggle = false,
  showPassword = false,
  onTogglePassword,
  className = ''
}) => {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
      )}
      
      <input
        type={type}
        className={`w-full px-4 py-3 border border-[var(--color-border)] rounded-lg 
          text-[var(--color-text-primary)] bg-[var(--color-bg-input)] 
          focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:border-transparent
          placeholder:text-[var(--color-text-placeholder)]
          transition-colors duration-200
          ${icon ? 'pl-10' : ''}
          ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
      
      {showPasswordToggle && (
        <button
          type="button"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200"
          onClick={onTogglePassword}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      )}
    </div>
  );
};

export default FormInput; 