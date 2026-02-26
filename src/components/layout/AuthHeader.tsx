import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
      <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-4">
        <Link to="/" className="inline-flex">
          <img src="/logo.svg" alt="Specode" className="h-7 w-auto" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
