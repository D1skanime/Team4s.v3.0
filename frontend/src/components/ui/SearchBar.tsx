'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  placeholder?: string;
  initialValue?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = 'Anime suchen...',
  initialValue = '',
  autoFocus = false
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Clear debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSearch = useCallback((searchQuery: string) => {
    if (searchQuery.length >= 2) {
      setIsLoading(true);
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search navigation
    if (value.length >= 2) {
      debounceRef.current = setTimeout(() => {
        handleSearch(value);
      }, 500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (query.length >= 2) {
      handleSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <form className={styles.searchBar} onSubmit={handleSubmit}>
      <div className={styles.inputWrapper}>
        <Search className={styles.searchIcon} size={18} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={styles.input}
          autoFocus={autoFocus}
          minLength={2}
        />
        {isLoading && (
          <Loader2 className={styles.loadingIcon} size={18} />
        )}
        {query && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearButton}
            aria-label="Suche leeren"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </form>
  );
}
