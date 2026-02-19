import React, { useState, useEffect, ChangeEvent } from 'react';

interface FormattedNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  disabled?: boolean;
  min?: number;
  placeholder?: string;
}

export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  className = "",
  disabled = false,
  placeholder = "0"
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState("");

  useEffect(() => {
    if (!isFocused) {
       // When not focused, show formatted value (with commas)
       // If 0, show "0"
       setInternalValue(value === 0 ? "0" : value.toLocaleString('en-US', { maximumFractionDigits: 2 }));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Requirement: Remove the 0 default value automatically
    if (value === 0) {
      setInternalValue("");
    } else {
      // On focus, switch to raw number string for editing
      setInternalValue(value.toString());
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    
    // Handle empty or just minus sign
    if (raw === "" || raw === "-") {
        setInternalValue(raw);
        if (raw === "") onChange(0);
        return;
    }
    
    // Allow standard float number format
    // Remove commas if user pastes them (though we removed them on focus, pasting is possible)
    const clean = raw.replace(/,/g, '');
    
    if (!/^-?\d*\.?\d*$/.test(clean)) return;

    setInternalValue(raw); // Update UI
    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) {
        onChange(parsed);
    }
  };

  return (
    <input
      type="text"
      className={className}
      disabled={disabled}
      value={internalValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  );
};