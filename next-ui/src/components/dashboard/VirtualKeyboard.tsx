 "use client";

import clsx from "clsx";
import type { CSSProperties } from "react";
import { DWELL_SELECT_MS } from "@/lib/config";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";

export type KeyboardKey = {
  label: string;
  value: string;
  variant?: "primary" | "ghost" | "action";
  wide?: boolean;
};

type VirtualKeyboardProps = {
  layout: KeyboardKey[][];
  onKeyPress: (value: string) => void;
  suggestionAvailable: boolean;
};

export function VirtualKeyboard({
  layout,
  onKeyPress,
  suggestionAvailable,
}: VirtualKeyboardProps) {
  const dwellStyle: CSSProperties = {
    // Used by .dwell-key in globals.css for the progress animation
    ["--dwell-duration" as any]: `${DWELL_SELECT_MS}ms`,
  };

  return (
    <Card 
      header={<SectionHeading title="Virtual Keyboard" variant="compact" />}
      padding="none"
      className="h-full flex flex-col min-h-0"
    >
      <div className="flex-1 flex flex-col gap-2.5 w-full p-4 min-h-0">
        {layout.map((row, rowIdx) => (
          <div
            key={`keyboard-row-${rowIdx}`}
            className="flex w-full gap-2 flex-1 min-h-0 items-stretch"
          >
            {row.map((key) => {
              const isAutocomplete = key.value === "AUTOCOMPLETE";
              const disabled = isAutocomplete && !suggestionAvailable;
              const isSpace = key.value === " ";
              const isBackspace = key.value === "BACKSPACE";
              const isClear = key.value === "CLEAR";
              
              return (
                <button
                  key={key.label}
                  onClick={() => onKeyPress(key.value)}
                  data-dwell-target="true"
                  disabled={disabled}
                  className={clsx(
                    "dwell-key font-medium transition-all duration-200 ease-out flex items-center justify-center relative rounded-xl h-full min-h-0 px-4",
                    
                    // Dwell active state (eye tracking hover) - using gradient
                    "data-[dwell-active=true]:bg-gradient-to-r data-[dwell-active=true]:from-[var(--madhacks-blue)] data-[dwell-active=true]:to-[var(--madhacks-blue-light)] data-[dwell-active=true]:text-white data-[dwell-active=true]:shadow-lg data-[dwell-active=true]:scale-105 data-[dwell-active=true]:z-10",
                    
                    // Dwell selected state (when clicked/selected)
                    "data-[dwell-selected=true]:bg-[var(--madhacks-dark-blue)] data-[dwell-selected=true]:scale-100",
                    
                    // Regular hover state
                    "hover:bg-gray-100",
                    "data-[dwell-active=true]:hover:bg-gradient-to-r data-[dwell-active=true]:hover:from-[var(--madhacks-blue)] data-[dwell-active=true]:hover:to-[var(--madhacks-blue-light)]", // Override gray hover when active
                    isAutocomplete && "hover:from-green-100 hover:to-green-200", // Override hover for autocomplete
                    
                    disabled && "cursor-not-allowed opacity-50 bg-gray-50",
                    
                    // Base styling for all keys
                    !disabled && "shadow-sm hover:shadow border border-gray-200",
                    
                    // Specific key styles
                    !isSpace && !isBackspace && !isClear && !isAutocomplete && key.value !== "ENTER" && [
                      "flex-1",
                      "bg-white text-gray-900",
                      "text-xl"
                    ],
                    isSpace && [
                      "flex-[4] min-w-0",
                      "bg-gray-50 text-gray-600 text-sm font-semibold uppercase tracking-wider"
                    ],
                    isBackspace && [
                      "flex-[1.5]",
                      "bg-gray-100 text-gray-600 text-xl"
                    ],
                    isClear && [
                      "flex-[1.5]",
                      "bg-red-50 text-red-600 border-red-100 hover:bg-red-100 text-sm font-bold uppercase tracking-wider"
                    ],
                    isAutocomplete && [
                      "flex-[1.5]",
                      "bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200 hover:from-green-100 hover:to-green-200",
                      "text-sm font-semibold uppercase tracking-wider"
                    ],
                    key.value === "ENTER" && [
                      "flex-1",
                      "bg-gradient-to-r from-[var(--madhacks-blue)] to-[var(--madhacks-blue-light)] text-white border-transparent hover:shadow-md",
                      "text-sm font-semibold"
                    ]
                  )}
                  style={dwellStyle}
                >
                  {key.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}
