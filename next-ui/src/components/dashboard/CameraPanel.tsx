"use client";

import { Text } from "@radix-ui/themes";
import { RefObject } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";

type CameraPanelProps = {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  onStart: () => void;
  onStop: () => void;
  emotionConfidence: number;
  isTracking: boolean;
};

export function CameraPanel({
  videoRef,
  canvasRef,
  isTracking,
}: CameraPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading title="Camera Feed" variant="compact" size="sm" />
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-900 border border-gray-200 shadow-inner">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover transform scale-x-[-1]" // Mirror effect
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full transform scale-x-[-1]" // Mirror effect to match video
        />
        {!isTracking && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/5 backdrop-blur-sm">
            <div className="bg-white/90 px-4 py-2 rounded-full shadow-sm border border-gray-200">
              <Text size="2" color="gray" weight="medium">
                Camera paused
              </Text>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
