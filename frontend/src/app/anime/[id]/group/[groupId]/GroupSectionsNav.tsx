'use client'

import { useState, useEffect } from "react";

import { Button } from "@/components/ui";

import styles from "./GroupSectionsNav.module.css";

const NAV_SECTIONS = [
  { id: "story", label: "Geschichte" },
  { id: "team", label: "Beteiligte" },
  { id: "releases", label: "Releases" },
  { id: "themes", label: "OP/ED/Middle" },
  { id: "medien", label: "Medien" },
] as const;

export function GroupSectionsNav() {
  const [activeSection, setActiveSection] = useState<string>("story");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );

    for (const { id } of NAV_SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav className={styles.nav} aria-label="Abschnitte">
      {NAV_SECTIONS.map(({ id, label }) => (
        <Button
          key={id}
          href={`#${id}`}
          variant={activeSection === id ? "subtle" : "ghost"}
          size="sm"
          aria-current={activeSection === id ? "true" : undefined}
        >
          {label}
        </Button>
      ))}
    </nav>
  );
}
