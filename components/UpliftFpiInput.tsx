import React, { useState, useEffect, ChangeEvent } from "react";

interface UpliftFpiInputProps {
  value: number;
  onChange: (val: number | null) => void;
  disabled?: boolean;
}

export const UpliftFpiInput: React.FC<UpliftFpiInputProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    // Format to 1 decimal place unless it ends with decimal typing
    if (value === 0 && displayText === "") {
      return;
    }
    const parsed = parseFloat(displayText);
    if (!isNaN(parsed) && parsed === value) {
      return;
    }
    // Set formatted text representation index
    setDisplayText(value.toFixed(1));
  }, [value]);

  const handleIncrement = () => {
    const next = Math.floor(value + 1);
    onChange(next);
    setDisplayText(next.toFixed(1));
  };

  const handleDecrement = () => {
    const prev = Math.ceil(value - 1);
    onChange(prev);
    setDisplayText(prev.toFixed(1));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-") {
      setDisplayText(raw);
      onChange(0);
      return;
    }

    const clean = raw.replace(/[^\d.-]/g, "");
    
    // Ensure only one dot, and check decimal constraint of max 1 digit
    const dots = clean.split(".");
    if (dots.length > 2) return;
    if (clean !== "" && !/^-?\d*\.?\d?$/.test(clean)) return;

    setDisplayText(clean);

    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (displayText === "" || displayText === "-") {
      setDisplayText("");
      onChange(0);
    } else {
      const parsed = parseFloat(displayText);
      if (!isNaN(parsed)) {
        setDisplayText(parsed.toFixed(1));
      }
    }
  };

  return (
    <div className="flex items-center space-x-2 select-none">
      <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 overflow-hidden">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled}
          className="px-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition text-gray-500 dark:text-gray-400 border-r border-gray-300 dark:border-gray-600 disabled:opacity-50 flex items-center justify-center font-bold text-lg cursor-pointer select-none"
          style={{ width: "36px", height: "36px" }}
        >
          -
        </button>

        <div className="relative flex-grow min-w-[70px]">
          <input
            type="text"
            disabled={disabled}
            value={displayText}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-full text-center text-sm border-0 focus:ring-0 p-2 pr-6 bg-transparent text-gray-900 dark:text-white font-sans font-medium tabular-nums ph-no-capture outline-none"
            placeholder="0.0"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">
            %
          </span>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled}
          className="px-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition text-gray-500 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600 disabled:opacity-50 flex items-center justify-center font-bold text-lg cursor-pointer select-none"
          style={{ width: "36px", height: "36px" }}
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          onChange(null);
          setDisplayText("");
        }}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 font-medium select-none"
        disabled={disabled}
      >
        Auto
      </button>
    </div>
  );
};
