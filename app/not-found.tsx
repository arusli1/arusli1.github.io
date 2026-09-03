import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center font-mono">
      <p className="text-2xl text-ink">404</p>
      <p className="text-sm text-muted">This page doesn&apos;t exist.</p>
      <Link href="/" className="text-sm text-accent underline">
        back home
      </Link>
    </div>
  );
}
