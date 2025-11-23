import { Flex, Heading, Text, Badge } from '@radix-ui/themes';

type HeaderSectionProps = {
  statusMessage: string;
  coordinates: { x: number; y: number };
  activeVoiceLabel: string;
};

export function HeaderSection({
  statusMessage,
  coordinates,
  activeVoiceLabel,
}: HeaderSectionProps) {
  return (
    <div className="flex flex-col border-b border-gray-200 bg-white shadow-sm z-10 relative">
      {/* Secondary Bar: Status & Info */}
      <div className="px-6 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-6 overflow-x-auto">
        <Flex align="center" gap="2" className="flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${statusMessage.includes('Tracking active') ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <Text size="2" color="gray" weight="medium">
            {statusMessage}
          </Text>
        </Flex>
        
        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
        
        <Flex align="center" gap="2" className="flex-shrink-0">
          <Text size="1" color="gray" className="uppercase tracking-wider font-semibold text-xs">
            Nose
          </Text>
          <Badge color="gray" variant="surface" radius="full" className="font-mono">
            X: {coordinates.x}%
          </Badge>
          <Badge color="gray" variant="surface" radius="full" className="font-mono">
            Y: {coordinates.y}%
          </Badge>
        </Flex>

        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

        <Flex align="center" gap="2" className="flex-shrink-0 min-w-0">
          <Text size="1" color="gray" className="uppercase tracking-wider font-semibold text-xs">
            Voice
          </Text>
          <Text size="2" weight="medium" className="truncate text-[var(--brand-blue-text)]">
            {activeVoiceLabel}
          </Text>
        </Flex>
      </div>
    </div>
  );
}
