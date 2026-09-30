import Link from "next/link";
import { Wordmark } from "@/components/marks";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Rasoi home">
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-start justify-center px-4 pt-4 pb-16 sm:px-6 sm:pt-10">
        {children}
      </main>
    </div>
  );
}
