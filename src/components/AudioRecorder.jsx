import React, { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

// Browser audio recording via MediaRecorder. Produces a WebM audio File that
// is processed exactly like an uploaded audio file.
export default function AudioRecorder({ onRecorded }) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const secondsRef = useRef(0);

  const supported =
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia;

  if (!supported) return null;

  const start = async () => {
    setMicError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        onRecorded(new File([blob], "recording.webm", { type: blob.type }), secondsRef.current);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorderRef.current = recorder;
      recorder.start();
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch (e) {
      setMicError(true);
    }
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  return (
    <div>
      {recording ? (
        <Button type="button" variant="destructive" onClick={stop} className="gap-2">
          <Square className="h-4 w-4" aria-hidden="true" />
          {t("stt.stopRecording")}
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={start} className="gap-2">
          <Mic className="h-4 w-4" aria-hidden="true" />
          {t("stt.startRecording")}
        </Button>
      )}
      {recording && (
        <p className="mt-2 text-sm text-muted-foreground">{t("stt.recording", { seconds })}</p>
      )}
      {micError && <p className="mt-2 text-sm text-destructive">{t("common.micError")}</p>}
    </div>
  );
}