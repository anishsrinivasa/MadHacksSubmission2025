'use client';

import Link from 'next/link';
import { Heading, Text } from '@radix-ui/themes';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { useEffect, useRef, useState } from 'react';

export default function LandingPage() {
  const mockupRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mockupRef.current) return;
      const rect = mockupRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (e.clientX - centerX) / (rect.width / 2);
      const y = (e.clientY - centerY) / (rect.height / 2);
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-16 lg:py-24">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="flex flex-col gap-6">
              <Heading size="9" className="font-bold leading-tight">
                Helping the specially abled reclaim their voices and connect emotionally in conversations
              </Heading>
              <Text size="5" color="gray" className="leading-relaxed">
                Type hands-free, convey emotion and tone with your own voice, create custom voice profiles, or select from 200,000+ voice presets.
                </Text>
              <div className="pt-4">
                <Link href="/app">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    Access Tool
                  </Button>
                </Link>
                </div>
                    </div>

            {/* Right: Mockup */}
            <div className="flex items-center justify-center">
              <div className="mockup-3d-container relative w-full max-w-lg">
                <div 
                  ref={mockupRef}
                  className="mockup-3d mockup-3d-shadow bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden relative"
                  style={{
                    transform: `perspective(1000px) rotateY(${mousePosition.x * 3}deg) rotateX(${-mousePosition.y * 3}deg) translateZ(10px)`,
                    transition: 'transform 0.15s ease-out'
                  }}
                >
                  {/* Browser Window */}
                  <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>

                  {/* Mockup Content */}
                  <div className="p-8 gradient-madhacks-light">
                    <div className="text-center mb-8">
                      <Text size="4" weight="medium">
                        Look to type...
                      </Text>
      </div>

                    {/* Mock Keyboard */}
                    <div className="flex gap-2 justify-center flex-wrap">
                      {['q', 'w', 'e', 'r', 't'].map((key, idx) => (
                        <div
                          key={key}
                          className={`
                            w-12 h-12 rounded-lg flex items-center justify-center
                            text-lg font-medium transition-all duration-300
                            ${idx === 3 
                              ? 'bg-[var(--brand-blue)] text-white shadow-lg scale-110' 
                              : 'bg-white text-gray-700 border border-gray-200 shadow-sm'
                            }
                          `}
                        >
                          {key}
      </div>
                      ))}
              </div>
        </div>
          </div>
        </div>
      </div>
          </div>
        </section>
    </main>
    </div>
  );
}
