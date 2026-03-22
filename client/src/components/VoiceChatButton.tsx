import { useState, useEffect } from "react";
import { Mic, Square, Loader2, Volume2 } from "lucide-react";
import { Button } from "./ui/button";
import { useVoiceRecorder, useVoiceStream } from "../../voice-integrations/audio";

interface VoiceChatButtonProps {
  onMessageStart: () => void;
  onTranscript: (text: string) => void;
  onResponse: (text: string) => void;
  onError: (error: string) => void;
}

export function VoiceChatButton({
  onMessageStart,
  onTranscript,
  onResponse,
  onError,
}: VoiceChatButtonProps) {
  const recorder = useVoiceRecorder();
  const stream = useVoiceStream({
    onUserTranscript: (text) => {
      onMessageStart();
      onTranscript(text);
    },
    onTranscript: (_, full) => {
      onResponse(full);
    },
    onError: (e) => {
      onError(e.message || "Voice chat failed");
    },
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    if (recorder.state === "recording") {
      setIsProcessing(true);
      try {
        const blob = await recorder.stopRecording();
        await stream.streamVoiceResponse("/api/voice-chat", blob);
      } catch (e: any) {
        onError(e.message || "Failed to process voice");
      } finally {
        setIsProcessing(false);
      }
    } else {
      try {
        await recorder.startRecording();
      } catch (e: any) {
        onError("Could not access microphone");
      }
    }
  };

  const isRecording = recorder.state === "recording";
  const isPlaying = stream.playbackState === "playing";

  return (
    <Button
      type="button"
      size="icon"
      variant={isRecording ? "destructive" : "secondary"}
      onClick={handleClick}
      disabled={isProcessing}
      className={`rounded-full shrink-0 transition-all duration-200 ${
        isRecording ? "animate-pulse shadow-lg scale-105" : "hover:scale-105"
      } ${isPlaying ? "bg-primary text-primary-foreground border-2 border-primary-foreground" : ""}`}
      title={isRecording ? "Stop Recording" : "Start Voice Chat"}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <Volume2 className="h-4 w-4 animate-pulse" />
      ) : isRecording ? (
        <Square className="h-4 w-4" fill="currentColor" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
