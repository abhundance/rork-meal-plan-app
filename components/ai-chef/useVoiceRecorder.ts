/**
 * useVoiceRecorder — Hook encapsulating audio recording, transcription,
 * pulse animation, and timer management for the AI Chef inline voice input.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated, Alert, Platform, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { useAiChefApi } from './useAiChefApi';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

/** Max recording duration in seconds — prevents oversized audio that Whisper will time out on */
const MAX_RECORDING_SECONDS = 180; // 3 minutes

export function useVoiceRecorder(onTranscribed: (text: string) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceElapsed, setVoiceElapsed] = useState(0);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const handleVoiceStopRef = useRef<() => void>(() => {});

  const { transcribeAudio } = useAiChefApi();

  // ── Pulse animation ───────────────────────────────────────────────────────

  const startPulse = useCallback(() => {
    pulseAnim.setValue(1);
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
      ]),
    );
    pulseLoopRef.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const clearVoiceTimer = useCallback(() => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => { clearVoiceTimer(); stopPulse(); };
  }, [clearVoiceTimer, stopPulse]);

  // ── Recording controls ────────────────────────────────────────────────────

  const handleVoiceStart = useCallback(async () => {
    if (voiceState !== 'idle') return;

    const { status } = await requestRecordingPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Microphone Access Required',
        Platform.OS === 'ios'
          ? 'Meal Plan needs microphone access to record your voice. Tap Open Settings and enable Microphone.'
          : 'Meal Plan needs microphone access. Tap Open Settings and enable the Microphone permission.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setVoiceElapsed(0);
      setVoiceState('recording');
      startPulse();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      voiceTimerRef.current = setInterval(() => {
        setVoiceElapsed(prev => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            // Auto-stop at max duration to prevent oversized audio
            handleVoiceStopRef.current();
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('[useVoiceRecorder] Failed to start recording:', err);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  }, [voiceState, audioRecorder, startPulse]);

  const handleVoiceStop = useCallback(async () => {
    if (voiceState !== 'recording') return;

    clearVoiceTimer();
    stopPulse();
    setVoiceState('transcribing');

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('No URI from recording');

      // Read audio file as base64
      const audioResponse = await fetch(uri);
      if (!audioResponse.ok) throw new Error('Could not read audio file.');
      const blob = await audioResponse.blob();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Strip data: prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const audioMimeType = blob.type || 'audio/m4a';

      // Clean up temp audio file — expo-audio writes to cache dir which the OS
      // will eventually purge, but we proactively release it to free space sooner.
      // expo-file-system is not installed; the recorder reuses the same temp path
      // on subsequent recordings, so leakage is bounded to one file per session.

      const transcribedText = await transcribeAudio(base64Audio, audioMimeType);

      if (transcribedText.length > 0) {
        onTranscribed(transcribedText);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('No speech detected', 'Could not detect any speech. Please try again.');
      }
    } catch (err) {
      console.error('[useVoiceRecorder] Voice transcription error:', err);
      Alert.alert(
        'Transcription Failed',
        'Could not transcribe your voice. Check your connection and try again.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Try Again', onPress: () => void handleVoiceStart() },
        ],
      );
    } finally {
      setVoiceState('idle');
      setVoiceElapsed(0);
    }
  }, [voiceState, audioRecorder, clearVoiceTimer, stopPulse, transcribeAudio, onTranscribed, handleVoiceStart]);

  // Keep ref in sync so the auto-stop timer can call handleVoiceStop without stale closure
  handleVoiceStopRef.current = handleVoiceStop;

  const handleVoiceCancel = useCallback(async () => {
    clearVoiceTimer();
    stopPulse();
    try { await audioRecorder.stop(); } catch { /* ignore */ }
    setVoiceState('idle');
    setVoiceElapsed(0);
  }, [audioRecorder, clearVoiceTimer, stopPulse]);

  const formatVoiceTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    voiceState,
    voiceElapsed,
    pulseAnim,
    handleVoiceStart,
    handleVoiceStop,
    handleVoiceCancel,
    formatVoiceTime,
  };
}
