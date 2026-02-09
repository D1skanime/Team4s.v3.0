'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, User, LogOut, LogIn, UserPlus, ChevronDown, Settings } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Header.module.css';

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
    router.push('/');
  };

  const displayName = user?.display_name || user?.username || 'User';

  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerContent}`}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            Team4s
          </Link>
          <nav className={styles.nav}>
            <Link href="/anime" className={styles.navLink}>
              Anime
            </Link>
            <Link href="/watchlist" className={styles.navLink}>
              <Bookmark size={16} />
              <span>Watchlist</span>
            </Link>
          </nav>
        </div>
        <div className={styles.center}>
          <SearchBar placeholder="Suchen..." />
        </div>
        <div className={styles.right}>
          {isLoading ? (
            <div className={styles.authLoading}>...</div>
          ) : isAuthenticated && user ? (
            <div className={styles.userMenu} ref={dropdownRef}>
              <button
                className={styles.userButton}
                onClick={() => setShowDropdown(!showDropdown)}
                aria-expanded={showDropdown}
                aria-haspopup="true"
              >
                <div className={styles.avatar}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className={styles.avatarImage} />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <span className={styles.userName}>{displayName}</span>
                <ChevronDown
                  size={16}
                  className={`${styles.chevron} ${showDropdown ? styles.chevronOpen : ''}`}
                />
              </button>
              {showDropdown && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownName}>{displayName}</span>
                    {user.username && displayName !== user.username && (
                      <span className={styles.dropdownUsername}>@{user.username}</span>
                    )}
                  </div>
                  <div className={styles.dropdownDivider} />
                  <Link
                    href={`/user/${user.username}`}
                    className={styles.dropdownItem}
                    onClick={() => setShowDropdown(false)}
                  >
                    <User size={16} />
                    <span>Mein Profil</span>
                  </Link>
                  <Link
                    href="/settings"
                    className={styles.dropdownItem}
                    onClick={() => setShowDropdown(false)}
                  >
                    <Settings size={16} />
                    <span>Einstellungen</span>
                  </Link>
                  <div className={styles.dropdownDivider} />
                  <button
                    className={styles.dropdownItem}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Abmelden</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authLinks}>
              <Link href="/login" className={styles.authLink}>
                <LogIn size={16} />
                <span>Anmelden</span>
              </Link>
              <Link href="/register" className={styles.authLinkPrimary}>
                <UserPlus size={16} />
                <span>Registrieren</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
