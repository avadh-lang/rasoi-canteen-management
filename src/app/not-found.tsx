import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="panel max-w-md p-8 text-center shadow-hard-lg">
        <p className="display nums text-7xl">404</p>
        <h1 className="mt-3 text-2xl font-black">This page isn&rsquo;t on the menu</h1>
        <p className="mt-2 text-muted">The link may be old, or the order belongs to someone else.</p>
        <Link href="/" className="btn btn-primary mt-6">Go to Rasoi home</Link>
      </div>
    </main>
  );
}
