import React, { useState, useEffect, ChangeEvent } from 'react';

interface FormattedNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
  min?: number;
  placeholder?: string;
}

export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  onBlur,
  className = "",
  disabled = false,
  placeholder = "0"
}) => {
  const [internalValue, setInternalValue] = useState("");

  // Helper to format a string with commas
  const formatWithCommas = (str: string) => {
    if (!str) return "";
    const parts = str.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  useEffect(() => {
    // Sync external value changes to internal state, but don't overwrite if the user is typing a decimal
    if (value === 0 && internalValue === "") {
      // Keep it empty if user cleared it
      return;
    }
    
    // If the parsed internal value matches the prop value, don't update to avoid cursor jumping
    const parsedInternal = parseFloat(internalValue.replace(/,/g, ''));
    if (!isNaN(parsedInternal) && parsedInternal === value) {
      // If it's just "0" or ends with "." or ".0", keep the internal value
      return;
    }

    if (value === 0 && internalValue !== "0") {
      setInternalValue("");
    } else {
      setInternalValue(formatWithCommas(value.toString()));
    }
  }, [value]);

  const handleFocus = () => {
    if (value === 0 && internalValue !== "0") {
      setInternalValue("");
    }
  };

  const handleBlur = () => {
    if (internalValue === "" || internalValue === "-") {
      setInternalValue("");
      onChange(0);
    } else {
      const clean = internalValue.replace(/,/g, '');
      const parsed = parseFloat(clean);
      if (!isNaN(parsed)) {
        setInternalValue(formatWithCommas(parsed.toString()));
      }
    }
    if (onBlur) {
      onBlur();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    
    if (raw === "" || raw === "-") {
        setInternalValue(raw);
        if (raw === "") onChange(0);
        return;
    }
    
    const clean = raw.replace(/,/g, '');
    
    // Allow numbers with optional decimal point
    if (!/^-?\d*\.?\d*$/.test(clean)) return;

    // Format with commas for display
    const formatted = formatWithCommas(clean);
    setInternalValue(formatted);
    
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