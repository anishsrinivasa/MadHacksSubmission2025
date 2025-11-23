"use client";

import { Flex, Text, TextField, Tabs, Badge, ScrollArea, Card as RadixCard } from "@radix-ui/themes";
import { VoiceProfile, VoiceSearchResult } from "@/types";
import { ChangeEvent, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

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
  recordStatus: string | null;
  uploadStatus: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  recordingState: "idle" | "recording" | "processing";
  recordedMs: number;
  uploadProgress: number;
  onFileChange: (file: File | null) => void;
  uploadFile: File | null;
  voiceQuery: string;
  onVoiceQueryChange: (value: string) => void;
  voiceResults: VoiceSearchResult[];
  voiceLoading: boolean;
  selectedVoiceId: string;
  onSelectVoice: (voice: { id: string; name: string }) => void;
  defaultVoiceId: string;
  defaultVoiceName: string;
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
  recordStatus,
  uploadStatus,
  startRecording,
  stopRecording,
  recordingState,
  recordedMs,
  uploadProgress,
  onFileChange,
  uploadFile,
  voiceQuery,
  onVoiceQueryChange,
  voiceResults,
  voiceLoading,
  selectedVoiceId,
  onSelectVoice,
  defaultVoiceId,
  defaultVoiceName,
}: ProfilesPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<VoiceProfile | null>(null);
  return (
    <>
      <Card
        header={
          <Flex direction="column" gap="1">
            <Flex align="center" gap="2">
              <SectionHeading title="Voice Profiles" subtitle="Manage your personalized voices." />
              <InfoTooltip content="Create custom voice profiles by recording, uploading audio, or exploring 200,000+ voices from Fish Audio. Each profile can be used for expressive text-to-speech." />
            </Flex>
          </Flex>
        }
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
              data-dwell-target="true"
              className="cursor-pointer px-1 pb-2 border-b-2 border-transparent text-gray-500 data-[state=active]:border-[var(--madhacks-teal)] data-[state=active]:text-[var(--madhacks-dark-blue)] data-[state=active]:font-semibold transition-colors"
            >
              My Profiles
            </Tabs.Trigger>
            <Tabs.Trigger
              value="explore"
              data-dwell-target="true"
              className="cursor-pointer px-1 pb-2 border-b-2 border-transparent text-gray-500 data-[state=active]:border-[var(--madhacks-teal)] data-[state=active]:text-[var(--madhacks-dark-blue)] data-[state=active]:font-semibold transition-colors"
            >
              Explore
            </Tabs.Trigger>
            <Tabs.Trigger
              value="record"
              data-dwell-target="true"
              className="cursor-pointer px-1 pb-2 border-b-2 border-transparent text-gray-500 data-[state=active]:border-[var(--madhacks-teal)] data-[state=active]:text-[var(--madhacks-dark-blue)] data-[state=active]:font-semibold transition-colors"
            >
              Record
            </Tabs.Trigger>
            <Tabs.Trigger
              value="upload"
              data-dwell-target="true"
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
                <div className="p-3 space-y-3 pb-4">
                {/* Default American Voice Option */}
                {mounted && (
                  <Card
                    padding="sm"
                    className={clsx(
                      "transition-all duration-200 cursor-pointer",
                      activeProfileId === null && selectedVoiceId === defaultVoiceId && "bg-blue-100 border-blue-300 shadow-md ring-2 ring-blue-300"
                    )}
                    noShadow={activeProfileId !== null || selectedVoiceId !== defaultVoiceId}
                    data-dwell-target="true"
                    onClick={() => {
                      // Clear any active profile and select the default voice
                      onActivate(null);
                      onSelectVoice({ id: defaultVoiceId, name: defaultVoiceName });
                    }}
                  >
                    <Flex direction="column" gap="2">
                      <Flex justify="between" align="center">
                        <Flex align="center" gap="2">
                          {activeProfileId === null && selectedVoiceId === defaultVoiceId && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-600">
                              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          <Text size="3" weight="bold" className={activeProfileId === null && selectedVoiceId === defaultVoiceId ? "text-blue-800" : "text-gray-900"}>
                            {defaultVoiceName}
                          </Text>
                        </Flex>
                        <Badge color="blue" variant="soft" radius="full" className="bg-blue-100 text-blue-700">
                          Default
                        </Badge>
                      </Flex>
                    </Flex>
                  </Card>
                )}
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
                        padding="sm"
                        className={clsx(
                          "transition-all duration-200 cursor-pointer",
                          isActive && "bg-blue-100 border-blue-300 shadow-md ring-2 ring-blue-300"
                        )}
                        noShadow={!isActive}
                        data-dwell-target="true"
                        onClick={() => onActivate(profile.id)}
                      >
                        <Flex direction="row" justify="between" align="center" gap="3">
                          <Flex direction="column" gap="1" className="flex-1 min-w-0">
                            <Flex justify="between" align="center" gap="2">
                              <Flex align="center" gap="2">
                                {isActive && (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-600 flex-shrink-0">
                                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                                <Text size="3" weight="bold" className={clsx("truncate", isActive ? "text-blue-800" : "text-gray-900")}>
                                  {profile.name}
                                </Text>
                              </Flex>
                            </Flex>
                            <Flex gap="2" align="center">
                              <Badge color="gray" variant="soft" radius="full" className="bg-gray-100 text-gray-600 text-xs">
                                {profile.source}
                              </Badge>
                              <Text size="1" color="gray" className="whitespace-nowrap">
                                {new Date(profile.createdAt).toLocaleDateString()}
                              </Text>
                            </Flex>
                          </Flex>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(profile);
                            }}
                            data-dwell-target="true"
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700"
                            aria-label="Delete profile"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
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
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
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
                <div className="p-3 space-y-3 pb-4">
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
                    data-dwell-target="true"
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
                      <Button
                        onClick={() => {
                          onSelectVoice({ id: voice.id, name: voice.title ?? "Fish Voice" });
                          onSaveFromVoice(voice);
                        }}
                        data-dwell-target="true"
                        variant="primary"
                        size="sm"
                        className="w-full"
                      >
                        Save and Use
                      </Button>
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
                <div className="p-3 space-y-3 pb-4">
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
                      data-dwell-target="true"
                      className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg transition-transform active:scale-95 flex items-center justify-center text-white"
                    >
                      <div className="h-6 w-6 rounded-full bg-white opacity-90" />
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      data-dwell-target="true"
                      className="h-16 w-16 rounded-full bg-gray-800 hover:bg-gray-900 shadow-lg transition-transform active:scale-95 flex items-center justify-center animate-pulse"
                    >
                      <div className="h-6 w-6 rounded bg-white opacity-90" />
                    </button>
                  )}
                </Flex>
                
                {recordingState === "processing" ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-full max-w-xs">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <Text align="center" size="1" color="gray" className="mt-1.5">
                        {Math.round(uploadProgress)}%
                      </Text>
                    </div>
                    <Text align="center" color="gray" size="2" className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      Creating voice model... Please wait
                    </Text>
                  </div>
                ) : (
                  <Text align="center" color="gray" size="2">
                    {recordingState === "recording" ? (
                      `Recording... ${Math.floor(recordedMs / 1000)}s`
                    ) : (
                      "Tap red button to start recording a sample."
                    )}
                  </Text>
                )}

                {/* Status message */}
                {recordStatus && recordingState === "idle" && (
                  <Text
                    align="center"
                    size="2"
                    className={
                      recordStatus.includes("failed") || recordStatus.includes("denied") || recordStatus.includes("Please")
                        ? "text-red-600"
                        : recordStatus.includes("created") || recordStatus.includes("success")
                        ? "text-green-600"
                        : "text-gray-600"
                    }
                  >
                    {recordStatus}
                  </Text>
                )}
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
                <div className="p-3 space-y-3 pb-4">
             <Card header={<SectionHeading title="Upload Audio Sample" />} padding="lg">
              <Flex direction="column" gap="4">
                <TextField.Root
                  placeholder="Name your voice profile"
                  value={profileName}
                  onChange={(e) => onProfileNameChange(e.target.value)}
                  size="3"
                />
                <div className="p-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-center hover:bg-gray-100 transition-colors cursor-pointer relative group" data-dwell-target="true">
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
                {uploadStatus && (uploadStatus.includes('Creating') || uploadStatus?.includes('Uploading')) ? (
                  <div className="space-y-3">
                    <div className="w-full">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <Text align="center" size="1" color="gray" className="mt-1.5">
                        {Math.round(uploadProgress)}%
                      </Text>
                    </div>
                    <Button
                      disabled
                      variant="primary"
                      size="lg"
                      fullWidth
                      className="justify-center"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        {uploadStatus}
                      </span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={onUploadProfile}
                    disabled={recordingState === 'processing'}
                    data-dwell-target="true"
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="justify-center"
                  >
                    Upload & Create Voice
                  </Button>
                )}

                {/* Status message */}
                {uploadStatus && !uploadStatus.includes('Creating') && !uploadStatus.includes('Uploading') && (
                  <Text
                    align="center"
                    size="2"
                    className={
                      uploadStatus.includes("failed") || uploadStatus.includes("denied") || uploadStatus.includes("Please") || uploadStatus.includes("Choose")
                        ? "text-red-600"
                        : uploadStatus.includes("created") || uploadStatus.includes("success")
                        ? "text-green-600"
                        : "text-gray-600"
                    }
                  >
                    {uploadStatus}
                  </Text>
                )}
              </Flex>
            </Card>
                </div>
              </ScrollArea>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
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
                  data-dwell-target="true"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  data-dwell-target="true"
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
