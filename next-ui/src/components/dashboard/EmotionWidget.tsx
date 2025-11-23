import { Flex, Text } from '@radix-ui/themes';
import { Emotion } from '@/types';
import { Card } from '@/components/ui/Card';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { SectionHeading } from '@/components/ui/SectionHeading';

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
  return (
    <Card
      padding="md"
      className={`h-full flex flex-col ${isTracking ? 'border-[var(--brand-blue-border)]' : ''}`}
      noShadow={!isTracking}
      header={
        <Flex align="center" gap="2">
          <SectionHeading title="Emotion Detection" variant="compact" size="sm" />
          <InfoTooltip content="Your facial expression is analyzed in real-time to detect emotions like happy, sad, angry, surprised, or neutral. This emotion affects the tone of your speech." />
        </Flex>
      }
    >
      {!isTracking ? (
        <Flex align="center" justify="center" className="h-full pt-2 pb-6 min-h-[200px]">
          <Text size="2" weight="medium" color="gray" className="opacity-60 text-center">
            Camera off<br/>No emotion detected
          </Text>
        </Flex>
      ) : (
        <Flex
          direction="column"
          align="center"
          justify="start"
          className="h-full pt-2 pb-6 min-h-[200px]"
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
              Current Emotion
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
      )}
    </Card>
  );
}
