import { useState } from 'react';
import { HoverCard, Text } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';

type InfoTooltipProps = {
  content: string;
};

export function InfoTooltip({ content }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <HoverCard.Root open={isOpen} onOpenChange={setIsOpen} openDelay={200} closeDelay={100}>
      <HoverCard.Trigger>
        <button
          data-dwell-target="true"
          onClick={handleClick}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-help flex-shrink-0 self-center"
          aria-label="More information"
        >
          <InfoCircledIcon width={18} height={18} />
        </button>
      </HoverCard.Trigger>
      <HoverCard.Content
        side="top"
        size="1"
        maxWidth="250px"
        className="bg-gray-900 text-white rounded-lg shadow-lg border border-gray-700 z-50"
        onPointerDownOutside={() => setIsOpen(false)}
        onEscapeKeyDown={() => setIsOpen(false)}
      >
        <Text size="2" className="leading-relaxed">
          {content}
        </Text>
      </HoverCard.Content>
    </HoverCard.Root>
  );
}
