import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Select...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left flex items-center justify-between px-3 py-2 bg-white/40 dark:bg-gray-800/60 backdrop-blur-md border border-white/60 dark:border-gray-600/50 rounded-lg shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),0_2px_5px_rgba(0,0,0,0.05)] transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/50 dark:hover:bg-gray-700/60 cursor-pointer'} text-gray-900 dark:text-white text-xs h-[30px]`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          className={`w-4 h-4 ml-2 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`absolute z-[100] w-full mt-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl border border-white/60 dark:border-gray-700/60 rounded-[1rem] shadow-[0_8px_32px_rgba(31,38,135,0.15)] overflow-hidden transition-all duration-300 origin-top ${isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}`}
      >
        <ul className="max-h-60 overflow-auto py-1 custom-scrollbar">
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2 text-xs cursor-pointer transition-colors ${value === opt.value ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
