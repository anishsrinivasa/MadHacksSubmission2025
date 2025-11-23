'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heading } from '@radix-ui/themes';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const pathname = usePathname();
  const isApp = pathname?.startsWith('/app');

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/logo.png"
              alt="Logo"
              width={48}
              height={48}
              className="object-contain"
            />
            <Heading
              size="7"
              className="font-extrabold tracking-tight text-gradient-unsilenced"
            >
              Unsilenced
            </Heading>
          </Link>

        </div>
      </nav>
    </header>
  );
}

