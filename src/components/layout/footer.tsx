// components/Footer.tsx
import Image from "next/image";
import Link from "next/link";
import Foodbag from "../ui/foodbag";
import Peppermill from "../ui/peppermill";
import { Separator } from "../ui/separator";

export default function Footer() {
  return (
    <footer className="bg-spanish-bg-dark text-white lg:py-16 py-10 w-full flex flex-col lg:gap-8 gap-6">
      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-0">
        <Link href="/" className="flex items-center gap-4">
          <div>
            <Image
              src="/assets/images/svg/logo-roja.svg"
              alt="Logo"
              width={0}
              height={0}
              className="w-20 h-20"
            />
          </div>
          <div className="text-spanish-accent text-2xl">
            <p className=" font-black">FURIA ROJA</p>
            <p className="tracking-[0.2em] -mt-2 font-semibold">FUTSAL</p>
          </div>
        </Link>
        <div className="flex flex-col items-end gap-2 ">
          <p className="font-bold font-marjorie italic lg:block hidden">
            sponsors
          </p>
          <div className="flex gap-8">
            <Link href="https://www.foodbag.be/fr" target="_blank">
              <Foodbag className="w-auto h-12 opacity-40 hover:opacity-100 transition-all" />
            </Link>
            <Link href="https://www.peppermillcasino.be/fr" target="_blank">
              <Peppermill className="w-auto h-12 opacity-40 hover:opacity-100 transition-all" />
            </Link>
          </div>
        </div>
      </div>
      <Separator className="container mx-auto bg-spanish-bg-light" />
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-spanish-bg-lighter">
        <p className="text-center md:text-left">
          &copy; {new Date().getFullYear()} Spanish Futsal. Tous droits
          réservés.
        </p>

        <div className="flex gap-4">
          <Link
            href="/mentions-legales"
            className="hover:text-spanish-accent-dark transition-all"
          >
            Mentions légales
          </Link>
          <Link
            href="https://instagram.com/spanish_futsal"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-spanish-accent-dark transition-all"
          >
            Instagram
          </Link>
          <Link
            href="https://instagram.com/spanish_futsal"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-spanish-accent-dark transition-all"
          >
            Facebook
          </Link>
          <Link
            href="https://instagram.com/spanish_futsal"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-spanish-accent-dark transition-all"
          >
            Tiktok
          </Link>
          <Link
            href="https://instagram.com/spanish_futsal"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-spanish-accent-dark transition-all"
          >
            Youtube
          </Link>
        </div>
      </div>
    </footer>
  );
}
