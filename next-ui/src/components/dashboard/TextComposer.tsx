"use client";

import clsx from "clsx";
import { Text } from "@radix-ui/themes";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";

type TextComposerProps = {
  text: string;
  suggestion: string;
  onClear: () => void;
};

export function TextComposer({ text, suggestion, onClear }: TextComposerProps) {
  const pendingSuffix = suggestion
    ? suggestion.slice(text.trim().split(/\s+/).pop()?.length ?? 0)
    : "";

  const headerMeta = (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-gray-400">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--madhacks-blue)]" />
        {text.length} chars
      </span>
    </div>
  );

  const renderCaret = (isEmpty: boolean) => (
    <span
      aria-hidden="true"
      className={clsx(
        "caret-indicator relative inline-block w-[2px] h-[1.25em] ml-1",
        isEmpty ? "bg-gray-300" : "bg-gray-900"
      )}
      style={{ top: "0.15em" }}
    />
  );

  return (
    <Card 
      header={
        <div className="flex items-center justify-between gap-6">
          <SectionHeading title="Text Composer" size="md" />
          {headerMeta}
        </div>
      }
      padding="md"
      className="h-full flex flex-col gap-3"
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 max-h-full w-full rounded-[20px] border border-gray-200 bg-white shadow-[0_10px_25px_rgba(15,23,42,0.05)] px-5 py-4 overflow-hidden">
          <div className="h-full overflow-y-auto leading-relaxed">
            {text.length === 0 ? (
              <Text size="4" color="gray" className="select-none opacity-50">
                Start typing with your nose or keyboard…{renderCaret(true)}
              </Text>
            ) : (
              <Text
                size="5"
                weight="regular"
                className="text-gray-900 whitespace-pre-wrap break-words leading-relaxed"
              >
                {text}
                {pendingSuffix && (
                  <Text as="span" size="5" color="gray" className="opacity-40">
                    {pendingSuffix}
                  </Text>
                )}
                {renderCaret(false)}
              </Text>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
