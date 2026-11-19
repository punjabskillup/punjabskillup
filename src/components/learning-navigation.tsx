"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronDown, Compass, FileText, PlayCircle } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

const tabs = [
  { href: "/explore", label: "Explore courses", Icon: Compass },
  { href: "/notes", label: "Notes", Icon: FileText },
  { href: "/free-lectures", label: "Free lectures", Icon: PlayCircle },
] as const;

export function LearningNavigation({ name }: { name: string }) {
  const pathname = usePathname();
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const isProfileSetup = pathname === "/user-info";
  const initial = name.trim().charAt(0).toUpperCase() || "L";
  const isActive = (href: string) =>
    pathname === href || (href === "/explore" && pathname.startsWith("/courses/"));

  useEffect(() => {
    if (accountMenuRef.current) {
      accountMenuRef.current.open = false;
    }
  }, [pathname]);

  useEffect(() => {
    function closeAccountMenu(event: PointerEvent) {
      const menu = accountMenuRef.current;
      if (menu && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }

    function closeAccountMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && accountMenuRef.current) {
        accountMenuRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", closeAccountMenu);
    document.addEventListener("keydown", closeAccountMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeAccountMenu);
      document.removeEventListener("keydown", closeAccountMenuOnEscape);
    };
  }, []);

  return (
    <>
      <header className="learning-topbar">
        <Link className="learning-logo" href="/explore" aria-label="PunjabSkillUp">
          Punjab<span>Skill</span>Up
        </Link>
        {!isProfileSetup && (
          <nav className="learning-desktop-tabs" aria-label="Learning">
            {tabs.map(({ href, label }) => (
              <Link
                aria-current={isActive(href) ? "page" : undefined}
                className={`learning-tab${isActive(href) ? " active" : ""}`}
                href={href}
                key={href}
                prefetch
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
        <details className="learning-account" ref={accountMenuRef}>
          <summary aria-label="Open account menu">
            <span className="learning-avatar" aria-hidden="true">{initial}</span>
            <span className="learning-account-name">{name}</span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <div className="learning-account-menu">
            <span className="learning-account-menu-name">{name}</span>
            <Link
              className="learning-account-menu-link"
              href="/user-info"
              onClick={() => {
                if (accountMenuRef.current) accountMenuRef.current.open = false;
              }}
            >
              Profile
            </Link>
            <SignOutButton />
          </div>
        </details>
      </header>
      {!isProfileSetup && (
        <nav className="learning-mobile-tabs" aria-label="Learning">
          {tabs.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`learning-mobile-tab${active ? " active" : ""}`}
                href={href}
                key={href}
                prefetch
              >
                <Icon aria-hidden="true" strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
