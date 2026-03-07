import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import Colors from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/theme';
import { transcribeAndExtract, ExtractedRecipe } from '@/services/recipeExtraction';

type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

type Props = {
  visible: boolean;
  onClose: () => void;
  onExtracted: (result: ExtractedRecipe) => void;
  onError: () => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoiceRecordSheet({ visible, onClose, onExtracted, onError }: Props) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState<number>(0);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseAnim.setValue(1);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 450, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 450, useNativeDriver: true }),
      ]),
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      clearTimer();
      stopPulse();
      setRecordingState('idle');
      setElapsed(0);
    }
  }, [visible, clearTimer, stopPulse]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopPulse();
    };
  }, [clearTimer, stopPulse]);

  const handleMicPress = useCallback(async () => {
    if (recordingState === 'processing') return;

    if (recordingState === 'recording') {
      clearTimer();
      setRecordingState('processing');

      try {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        stopPulse();

        if (!uri) throw new Error('No URI from recording');

        console.log('[VoiceRecordSheet] Processing audio from:', uri);
        const result = await transcribeAndExtract(uri);
        onExtracted(result);
      } catch (err) {
        console.error('[VoiceRecordSheet] Error processing recording:', err);
        setRecordingState('error');
        onError();
      }
      return;
    }

    const { status } = await requestRecordingPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Microphone Access Required',
        Platform.OS === 'ios'
          ? 'Meal Plan needs microphone access to record your recipe. Tap Open Settings and enable Microphone under Meal Plan.'
          : 'Meal Plan needs microphone access to record your recipe. Tap Open Settings and enable the Microphone permission.',
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
      setElapsed(0);
      setRecordingState('recording');
      startPulse();

      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[VoiceRecordSheet] Failed to start recording:', err);
      setRecordingState('error');
    }
  }, [recordingState, clearTimer, stopPulse, startPulse, onExtracted, onError]);

  const subtitleText = () => {
    switch (recordingState) {
      case 'recording': return 'Listening... tap to stop';
      case 'processing': return 'Extracting recipe...';
      case 'error': return 'Something went wrong. Please try again.';
      default: return 'Tap the microphone and describe your recipe';
    }
  };

  const subtitleColor = () => {
    switch (recordingState) {
      case 'recording': return Colors.primary;
      case 'error': return Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const renderButtonContent = () => {
    if (recordingState === 'processing') {
      return <ActivityIndicator size="small" color={Colors.primary} />;
    }
    if (recordingState === 'recording') {
      return <Square size={30} color={Colors.white} fill={Colors.white} strokeWidth={2} />;
    }
    return <Mic size={36} color={Colors.primary} strokeWidth={2} />;
  };

  const buttonBg = recordingState === 'recording' ? Colors.primary : Colors.primaryLight;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.content}>
          <Text style={styles.title}>Voice Recipe</Text>
          <Text style={[styles.subtitle, { color: subtitleColor() }]}>{subtitleText()}</Text>

          <View style={styles.micArea}>
            {recordingState === 'recording' && (
              <Animated.View
                style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}
              />
            )}
            <TouchableOpacity
              onPress={handleMicPress}
              disabled={recordingState === 'processing'}
              activeOpacity={0.8}
              style={[styles.micButton, { backgroundColor: recordingState === 'processing' ? Colors.border : buttonBg }]}
            >
              {renderButtonContent()}
            </TouchableOpacity>
          </View>

          {recordingState === 'recording' && (
            <Text style={styles.timer}>{formatTime(elapsed)}</Text>
          )}

          {recordingState !== 'processing' && (
            <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 99,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
  },
  micArea: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight,
  },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
