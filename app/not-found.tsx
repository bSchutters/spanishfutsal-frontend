import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-spanish-bg text-white gap-6">
      <h1 className="text-6xl font-marjorie font-bold italic text-spanish-accent-2">404</h1>
      <p className="text-xl">Page non trouvée</p>
      <Link
        href="/"
        className="px-6 py-3 bg-spanish-accent-2 text-spanish-bg-dark font-bold rounded-lg hover:opacity-80 transition-all"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
