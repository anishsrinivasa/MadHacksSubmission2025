import { Flex, Text } from '@radix-ui/themes';
import { Emotion } from '@/types';
import { Card } from '@/components/ui/Card';

type EmotionWidgetProps = {
  emotion: Emotion;
  confidence: number;
  isTracking: boolean;
  emoji: string;
  label: string;
};

export function EmotionWidget({
  confidence,
  isTracking,
  emoji,
  label,
}: EmotionWidgetProps) {
  if (!isTracking) {
    return (
      <Card padding="md" className="h-full flex items-center justify-center" noShadow>
        <Text size="2" weight="medium" color="gray" className="opacity-60 text-center">
          Camera off<br/>No emotion detected
        </Text>
      </Card>
    );
  }

  return (
    <Card 
      padding="md" 
      className="h-full flex flex-col border-[var(--brand-blue-border)]"
    >
      <Flex
        direction="column"
        align="center"
        justify="start"
        className="h-full pt-4 pb-6"
        gap="4"
      >
        <Text
          size="9"
          className="leading-none filter drop-shadow-sm transform transition-transform hover:scale-110"
        >
          {emoji}
        </Text>
        <Flex direction="column" align="center" gap="1">
          <Text
            size="1"
            color="gray"
            weight="medium"
            className="uppercase tracking-wider text-xs"
          >
            Detected Emotion
          </Text>
          <Text
            size="6"
            weight="bold"
            className="text-[var(--brand-blue-active)]"
          >
            {label}
          </Text>
          <Text size="3" color="gray" weight="medium">
            {(confidence * 100).toFixed(0)}%
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}
