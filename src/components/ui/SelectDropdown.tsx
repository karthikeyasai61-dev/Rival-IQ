// ============================================================
// Custom Select Dropdown Component
// Completely replaces native OS dropdowns with custom dark glassmorphism
// ============================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SelectOption {
  value: string;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
}

interface SelectDropdownProps {
  id?: string;
  label?: string;
  value: string;
  options: (string | SelectOption)[];
  onChange: (val: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

export default function SelectDropdown({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  icon,
  required = false,
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options
  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        position: 'relative',
      }}
    >
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#a1a1aa',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {label}
          {required && <span style={{ color: '#a3e635' }}>*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div
        id={id}
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '11px 14px',
          background: 'rgba(20, 26, 22, 0.95)',
          border: isOpen ? '1px solid #a3e635' : '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          color: '#f4f4f5',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          outline: 'none',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(163, 230, 53, 0.18), 0 8px 24px rgba(0, 0, 0, 0.4)'
            : '0 2px 8px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          {icon && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: 'rgba(163, 230, 53, 0.12)',
                color: '#bef264',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <span
            style={{
              color: selectedOption ? '#f4f4f5' : '#71717a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        {/* Custom Chevron SVG that rotates */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isOpen ? '#bef264' : '#a1a1aa'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.2s ease',
            flexShrink: 0,
            marginLeft: '8px',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Floating Glassmorphism Options Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'linear-gradient(180deg, #18201a 0%, #121814 100%)',
            border: '1px solid rgba(163, 230, 53, 0.3)',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            zIndex: 9999,
            maxHeight: '240px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: isSelected ? '#bef264' : '#d4d4d8',
                  background: isSelected ? 'rgba(163, 230, 53, 0.16)' : 'transparent',
                  fontWeight: isSelected ? 600 : 450,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: isSelected ? '1px solid rgba(163, 230, 53, 0.25)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(163, 230, 53, 0.09)';
                    e.currentTarget.style.color = '#bef264';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#d4d4d8';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {opt.icon && <span style={{ opacity: 0.8 }}>{opt.icon}</span>}
                  <span>{opt.label}</span>
                </div>
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#bef264"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
