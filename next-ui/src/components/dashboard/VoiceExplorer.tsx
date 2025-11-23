"use client";

import { Card, Flex, Text, TextField, Button, Heading } from "@radix-ui/themes";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { VoiceSearchResult } from "@/types";

type QuickVoice = {
  id: string;
  name: string;
  emoji?: string;
};

type VoiceExplorerProps = {
  voiceQuery: string;
  onVoiceQueryChange: (value: string) => void;
  voiceResults: VoiceSearchResult[];
  voiceLoading: boolean;
  quickVoices: QuickVoice[];
  selectedVoiceId: string;
  onSelectVoice: (voice: { id: string; name: string }) => void;
  onSaveProfileFromVoice: (voice: VoiceSearchResult) => void;
};

export function VoiceExplorer({
  voiceQuery,
  onVoiceQueryChange,
  voiceResults,
  voiceLoading,
  quickVoices,
  selectedVoiceId,
  onSelectVoice,
  onSaveProfileFromVoice,
}: VoiceExplorerProps) {
  return (
    <Card size="3" className="h-full flex flex-col shadow-sm">
      <div className="mb-4">
        <Heading size="4" mb="1">
          Voice Explorer
        </Heading>
        <Text color="gray" size="2">
          Search Fish Audio voices and save favorites.
        </Text>
      </div>
      <Flex gap="2" mb="4" wrap="wrap">
        {quickVoices.map((voice) => (
          <Button
            key={voice.id}
            variant={selectedVoiceId === voice.id ? "solid" : "soft"}
            color="blue"
            size="2"
            onClick={() => onSelectVoice({ id: voice.id, name: voice.name })}
          >
            {voice.emoji} {voice.name}
          </Button>
        ))}
      </Flex>
      <TextField.Root
        value={voiceQuery}
        onChange={(event) => onVoiceQueryChange(event.target.value)}
        placeholder="Search voices by tone, gender, language..."
        size="3"
        mb="4"
      />
      <ScrollArea.Root className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea.Viewport className="h-full w-full">
          <div className="space-y-3 pr-4">
            {voiceLoading && (
              <Text size="2" color="gray">
                Searching voices...
              </Text>
            )}
            {!voiceLoading && voiceResults.length === 0 && voiceQuery && (
              <Text size="2" color="gray">
                No voices found. Try different keywords.
              </Text>
            )}
            {voiceResults.map((voice) => (
              <Card key={voice.id} variant="surface" size="2">
                <Flex direction="column" gap="2">
                  <div>
                    <Text size="2" weight="bold">
                      {voice.title || "Untitled voice"}
                    </Text>
                    {voice.tags && (
                      <Text size="1" color="gray" mt="1" as="div">
                        {Array.isArray(voice.tags) ? voice.tags.join(", ") : voice.tags}
                      </Text>
                    )}
                  </div>
                  <Flex gap="2">
                    <Button
                      variant="soft"
                      color="blue"
                      size="2"
                      onClick={() =>
                        onSelectVoice({ id: voice.id, name: voice.title ?? "Fish Voice" })
                      }
                    >
                      Use voice
                    </Button>
                    <Button
                      variant="outline"
                      color="gray"
                      size="2"
                      onClick={() => onSaveProfileFromVoice(voice)}
                    >
                      Save
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical">
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </Card>
  );
}


