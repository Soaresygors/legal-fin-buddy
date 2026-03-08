import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function CurrencyInput({ value, onChange, placeholder = 'R$ 0,00', className = '', required }: CurrencyInputProps) {
  function formatForDisplay(val: number): string {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const [display, setDisplay] = useState(() => {
    if (value !== null && value !== undefined) {
      return formatForDisplay(value);
    }
    return '';
  });

  // Sync display when value changes externally (e.g. opening edit form)
  useEffect(() => {
    if (value !== null && value !== undefined) {
      setDisplay(formatForDisplay(value));
    } else {
      setDisplay('');
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (raw === '') {
      setDisplay('');
      onChange(null);
      return;
    }
    const numericValue = parseInt(raw, 10) / 100;
    setDisplay(formatForDisplay(numericValue));
    onChange(numericValue);
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={`flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />
    </div>
  );
}