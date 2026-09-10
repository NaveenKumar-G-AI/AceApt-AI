"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Network,
  MessageCircle,
  TrendingUp,
  RotateCcw,
  Bookmark,
  Settings,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { useLearning } from "./LearningProvider";
const nav = [
  ["/", "Workspace", LayoutDashboard],
  ["/learn", "Learn & understand", BookOpen],
  ["/practice", "Practice studio", Target],
  ["/skills", "Skill map", Network],
  ["/tutor", "Ask ACEAPT", MessageCircle],
  ["/progress", "Your progress", TrendingUp],
  ["/revision", "Revision", RotateCcw],
  ["/library", "Personal library", Bookmark],
  ["/settings", "Preferences", Settings],
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { notice } = useLearning();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Zap size={22} fill="currentColor" />
          </span>
          ACEAPT<span className="brand-dot">.</span>
        </Link>
        <div className="sidebar-caption">YOUR LEARNING SPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {path === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="mini-label">A LITTLE, EVERY DAY</span>
          <p>
            Build the reasoning.
            <br />
            The answers will follow.
          </p>
          <Link href="/practice">
            Find your next challenge <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="local-badge">
          <span /> Anonymous workspace
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            Aptitude /{" "}
            <strong>
              {nav.find(([href]) => href === path)?.[1] ?? "Learning"}
            </strong>
          </span>
          <span className="device-note">
            <span className="status-dot" /> Progress saved on this device
          </span>
        </header>
        <main id="main-content">
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {children}
        </main>
        <footer>
          ACEAPT · Understand more. Solve independently.
          <span>Prototype · Your learning stays in this browser</span>
        </footer>
      </div>
    </div>
  );
}
