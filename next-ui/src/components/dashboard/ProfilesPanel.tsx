"use client";

import { Flex, Text, TextField, Tabs, Badge, ScrollArea, Card as RadixCard } from "@radix-ui/themes";
import { VoiceProfile, VoiceSearchResult } from "@/types";
import { ChangeEvent, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";

type ProfilesPanelProps = {
  mounted: boolean;
  profiles: VoiceProfile[];
  activeProfileId: string | null;
  onActivate: (id: string | null) => void;
  onRemove: (id: string) => void;
  onSaveFromVoice: (voice: VoiceSearchResult) => void;
  profileTab: "profiles" | "record" | "upload" | "explore";
  onTabChange: (tab: "profiles" | "record" | "upload" | "explore") => void;
  profileName: string;
  onProfileNameChange: (value: string) => void;
  manualVoiceId: string;
  onManualVoiceIdChange: (value: string) => void;
  manualDescription: string;
  onManualDescriptionChange: (value: string) => void;
  onManualSave: () => void;
  onUploadProfile: () => void;
  uploadStatus: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  recordingState: "idle" | "recording" | "processing";
  recordedMs: number;
  onFileChange: (file: File | null) => void;
  uploadFile: File | null;
  voiceQuery: string;
  onVoiceQueryChange: (value: string) => void;
  voiceResults: VoiceSearchResult[];
  voiceLoading: boolean;
  selectedVoiceId: string;
  onSelectVoice: (voice: { id: string; name: string }) => void;
};

export function ProfilesPanel({
  mounted,
  profiles,
  activeProfileId,
  onActivate,
  onRemove,
  onSaveFromVoice,
  profileTab,
  onTabChange,
  profileName,
  onProfileNameChange,
  manualVoiceId,
  onManualVoiceIdChange,
  manualDescription,
  onManualDescriptionChange,
  onManualSave,
  onUploadProfile,
  uploadStatus,
  startRecording,
  stopRecording,
  recordingState,
  recordedMs,
  onFileChange,
  uploadFile,
  voiceQuery,
  onVoiceQueryChange,
  voiceResults,
  voiceLoading,
  selectedVoiceId,
  onSelectVoice,
}: ProfilesPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<VoiceProfile | null>(null);
  return (
    <>
      <Card 
        header={<SectionHeading title="Voice Profiles" subtitle="Manage your personalized voices." />}
        padding="none"
        className="h-full min-h-0 flex flex-col"
      >
        {/* Tabs */}
        <Tabs.Root value={profileTab} onValueChange={(value) => onTabChange(value as any)} className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 pt-1 border-b border-gray-200 bg-white">
          <Tabs.List
            size="2"
            className="flex-nowrap justify-between gap-2 text-sm"
          >
            <Tabs.Trigger
              value="profiles"
              className="cursor-pointer px-1 pb-2 border-b-2 border-transparent text-gray-500 data-[state=active]:border-[var(--madhacks-teal)] data-[state=active]:text-[var(--madhacks-dark-blue)] data-[state=active]:font-semibold transition-colors"
            >
              My Profiles
            </Tabs.Trigger>
            <Tabs.Trigger
              value="explore"
              className="cursor-pointer px-1 pb-2 border-b-2 border-transparent text-gray-500 data-[state=active]:border-[var(--madhacks-teal)] data-[state=active]:text-[var(--madhacks-dark-blue)] data-[state=active]:font-semibold transition-colors"
            >
              Explore
            </Tabs.Trigger>
            <Tabs.Trigger
              value="record"
              className="cursor-pointer px-1 pb-2 border-b-2 border-transparent text-gray-500 data-[state=active]:border-[var(--madhacks-teal)] data-[state=active]:text-[var(--madhacks-dark-blue)] data-[state=active]:font-semibold transition-colors"
            >
              Record
            </Tabs.Trigger>
            <Tabs.Trigger
              value="upload"
              className="cursor-pointer px-1 pb-2 border-b-2 border-transparent text-gray-500 data-[state=active]:border-[var(--madhacks-teal)] data-[state=active]:text-[var(--madhacks-dark-blue)] data-[state=active]:font-semibold transition-colors"
            >
              Upload
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        <div className="flex-1 min-h-0 bg-gray-50">
          {/* My Profiles Tab */}
          <Tabs.Content value="profiles" className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0">
              <ScrollArea scrollbars="vertical" className="h-full">
                <div className="p-6 space-y-4 pb-8">
                {!mounted ? (
                  <Text color="gray" size="2">Loading profiles…</Text>
                ) : profiles.length === 0 ? (
                  <Card padding="lg" noShadow className="text-center border-2 border-dashed border-gray-200">
                    <Text color="gray" size="2">
                      No saved voices yet. <br/> Save from Explore or create one.
                    </Text>
                  </Card>
                ) : (
                  profiles.map((profile) => {
                    const isActive = activeProfileId === profile.id;
                    return (
                      <Card
                        key={profile.id}
                        padding="md"
                        className={clsx(
                          "transition-all duration-200",
                          isActive && "bg-[var(--brand-blue-light)] border-[var(--brand-blue-border)] shadow-sm ring-1 ring-[var(--brand-blue-border)]"
                        )}
                        noShadow={!isActive}
                      >
                        <Flex direction="column" gap="3">
                          <div>
                            <Flex justify="between" align="center">
                              <Text size="3" weight="bold" className={isActive ? "text-[var(--brand-blue-active)]" : "text-gray-900"}>
                                {profile.name}
                              </Text>
                              {isActive && <Badge color="blue" variant="surface">Active</Badge>}
                            </Flex>
                            <Text size="1" color="gray" className="mt-1 block font-mono opacity-70 truncate">
                              ID: {profile.voiceId?.slice(0, 8)}...
                            </Text>
                            <Flex gap="2" mt="2">
                              <Badge color="gray" variant="soft" radius="full" className="bg-gray-100 text-gray-600">
                                {profile.source}
                              </Badge>
                              <Text size="1" color="gray" className="self-center">
                                {new Date(profile.createdAt).toLocaleDateString()}
                              </Text>
                            </Flex>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                            <Button
                              onClick={() => onActivate(profile.id)}
                              variant={isActive ? "primary" : "secondary"}
                              size="sm"
                            >
                              {isActive ? "Active" : "Use"}
                            </Button>
                            <Button
                              onClick={() =>
                                onSaveFromVoice({
                                  id: profile.voiceId ?? "",
                                  title: profile.name,
                                })
                              }
                              variant="ghost"
                              size="sm"
                            >
                              Details
                            </Button>
                            <Button
                              onClick={() => setDeleteTarget(profile)}
                              variant="danger"
                              size="sm"
                            >
                              Remove
                            </Button>
                          </div>
                        </Flex>
                      </Card>
                    );
                  })
                )}
                </div>
              </ScrollArea>
            </div>
          </Tabs.Content>

          {/* Explore Tab */}
          <Tabs.Content value="explore" className="h-full flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <TextField.Root
                value={voiceQuery}
                onChange={(event) => onVoiceQueryChange(event.target.value)}
                placeholder="Search by tone, gender, language..."
                size="3"
                className="w-full bg-white border-gray-200"
              >
                <TextField.Slot>🔍</TextField.Slot>
              </TextField.Root>
            </div>

            <div className="flex-1 min-h-0">
              <ScrollArea scrollbars="vertical" className="h-full">
                <div className="p-4 space-y-3 pb-8">
                {voiceLoading && <Text size="2" color="gray" className="p-4 text-center block">Searching voices...</Text>}
                {!voiceLoading && voiceResults.length === 0 && voiceQuery && (
                  <Text size="2" color="gray" className="p-4 text-center block">No voices found.</Text>
                )}
                {voiceResults.map((voice) => (
                  <Card
                    key={voice.id}
                    padding="md"
                    className="hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                    noShadow
                  >
                    <Flex direction="column" gap="3">
                      <div>
                        <Text size="2" weight="bold" className="text-gray-900">{voice.title || "Untitled voice"}</Text>
                        {voice.tags && (
                          <Flex gap="1" wrap="wrap" mt="2">
                            {(Array.isArray(voice.tags) ? voice.tags : [voice.tags]).map((tag, i) => (
                              <Badge key={i} size="1" color="gray" variant="soft" className="bg-gray-100 text-gray-600">{tag}</Badge>
                            ))}
                          </Flex>
                        )}
                      </div>
                      <Flex gap="2">
                        <Button
                          onClick={() => onSelectVoice({ id: voice.id, name: voice.title ?? "Fish Voice" })}
                          variant="primary"
                          size="sm"
                          className="flex-1"
                        >
                          Use
                        </Button>
                        <Button
                          onClick={() => onSaveFromVoice(voice)}
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                        >
                          Save
                        </Button>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
                </div>
              </ScrollArea>
            </div>
          </Tabs.Content>

          {/* Record Tab */}
          <Tabs.Content value="record" className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0">
              <ScrollArea scrollbars="vertical" className="h-full">
                <div className="p-6 space-y-4 pb-8">
            <Card header={<SectionHeading title="Record New Voice" />} padding="lg">
              <Flex direction="column" gap="4">
                <TextField.Root
                  placeholder="Name your voice profile"
                  value={profileName}
                  onChange={(e) => onProfileNameChange(e.target.value)}
                  size="3"
                />
                
                <Flex gap="3" align="center" justify="center" className="py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  {recordingState === "idle" ? (
                    <button 
                      onClick={startRecording} 
                      className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg transition-transform active:scale-95 flex items-center justify-center text-white"
                    >
                      <div className="h-6 w-6 rounded-full bg-white opacity-90" />
                    </button>
                  ) : (
                    <button 
                      onClick={stopRecording} 
                      className="h-16 w-16 rounded-full bg-gray-800 hover:bg-gray-900 shadow-lg transition-transform active:scale-95 flex items-center justify-center animate-pulse"
                    >
                      <div className="h-6 w-6 rounded bg-white opacity-90" />
                    </button>
                  )}
                </Flex>
                
                <Text align="center" color="gray" size="2">
                  {recordingState === "recording" 
                    ? `Recording... ${Math.floor(recordedMs / 1000)}s`
                    : "Tap red button to start recording a sample."}
                </Text>
              </Flex>
            </Card>
                </div>
              </ScrollArea>
            </div>
          </Tabs.Content>

          {/* Upload Tab */}
          <Tabs.Content value="upload" className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0">
              <ScrollArea scrollbars="vertical" className="h-full">
                <div className="p-6 space-y-4 pb-8">
             <Card header={<SectionHeading title="Upload Audio Sample" />} padding="lg">
              <Flex direction="column" gap="4">
                <TextField.Root
                  placeholder="Name your voice profile"
                  value={profileName}
                  onChange={(e) => onProfileNameChange(e.target.value)}
                  size="3"
                />
                <div className="p-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-center hover:bg-gray-100 transition-colors cursor-pointer relative group">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onFileChange(event.target.files?.[0] ?? null)
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {uploadFile ? (
                    <div className="group-hover:scale-105 transition-transform duration-200">
                      <Text color="gray" weight="medium" className="text-gray-900">
                        ✓ {uploadFile.name}
                      </Text>
                      <Text size="1" color="gray" className="mt-2 block text-gray-500">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Click to change
                      </Text>
                    </div>
                  ) : (
                    <div className="group-hover:scale-105 transition-transform duration-200">
                      <Text color="gray" weight="medium" className="text-gray-900">
                        Click to select audio file
                      </Text>
                      <Text size="1" color="gray" className="mt-2 block text-gray-500">
                        Supports MP3, WAV, WEBM
                      </Text>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={onUploadProfile} 
                  disabled={!profileName.trim() || !uploadFile}
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="justify-center"
                >
                  Upload & Create Voice
                </Button>
              </Flex>
            </Card>
                </div>
              </ScrollArea>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>

      {uploadStatus && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <Text size="2" color={uploadStatus.includes("failed") || uploadStatus.includes("denied") ? "red" : "gray"}>
            {uploadStatus}
          </Text>
        </div>
      )}
      </Card>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <RadixCard size="3" className="w-full max-w-md shadow-xl">
            <Flex direction="column" gap="4">
              <div>
                <SectionHeading title="Delete profile?" size="lg" />
                <Text size="2" color="gray">
                  Are you sure you want to remove{" "}
                  <Text as="span" weight="medium" color="gray">
                    {deleteTarget.name}
                  </Text>
                  ? This action cannot be undone.
                </Text>
              </div>
              <Flex gap="3" justify="end">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    onRemove(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                >
                  Delete
                </Button>
              </Flex>
            </Flex>
          </RadixCard>
        </div>
      )}
    </>
  );
}
