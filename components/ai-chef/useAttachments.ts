/**
 * useAttachments — Hook for image and document picking in the AI Chef chat.
 *
 * Handles camera, photo library, and document (PDF/text) picking.
 * PDFs are routed through extractRecipeFromPdf (extract-recipe Edge Function)
 * which does server-side text extraction. Text/HTML docs are sent inline via chat.
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
// ExtractedRecipe type used by the parent component; PDF extraction is
// delegated via onPdfExtraction callback — no direct import needed here.

/** Max PDF size in bytes (10 MB). Supabase Edge Functions accept up to 10 MB body. */
const MAX_PDF_BYTES = 10 * 1024 * 1024;

interface PendingImage {
  uri: string;
  base64: string;
}

export function useAttachments(
  setPendingImage: (img: PendingImage | null) => void,
  setShowAttachments: (show: boolean) => void,
  onDocumentReady: (message: string) => void,
  onPdfExtraction: (fileUri: string, filename: string) => void,
) {
  /**
   * Pick an image from camera or photo library.
   */
  const pickImage = useCallback(async (fromCamera: boolean) => {
    // Request permission first and surface denial to the user
    const permFn = fromCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert(
        fromCamera ? 'Camera Access Needed' : 'Photo Library Access Needed',
        `Please allow access in your device settings to ${fromCamera ? 'take photos' : 'choose images'}.`,
      );
      return;
    }

    const fn = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await fn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setPendingImage({ uri: asset.uri, base64: asset.base64 });
        setShowAttachments(false);
      }
    }
  }, [setPendingImage, setShowAttachments]);

  /**
   * Pick a PDF or text document and prepare its content for the AI Chef.
   */
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'text/html'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const isPdf = asset.mimeType === 'application/pdf' || asset.name?.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        // Check file size before proceeding
        const fileResponse = await fetch(asset.uri);
        const blob = await fileResponse.blob();
        if (blob.size > MAX_PDF_BYTES) {
          Alert.alert(
            'PDF Too Large',
            `This PDF is ${Math.round(blob.size / (1024 * 1024))}MB. The maximum supported size is 10MB. Try a smaller file or take a photo of the recipe page instead.`,
          );
          return;
        }
        if (blob.size < 100) {
          Alert.alert('Empty PDF', 'The selected PDF appears to be empty. Try a different file.');
          return;
        }

        // Route through server-side extraction (text extraction + GPT-4o-mini)
        setShowAttachments(false);
        onPdfExtraction(asset.uri, asset.name ?? 'recipe.pdf');
      } else {
        // Text/HTML files — read as plain text
        const fileResponse = await fetch(asset.uri);
        const fileText = await fileResponse.text();

        if (!fileText.trim()) {
          Alert.alert('Empty Document', 'The selected file appears to be empty. Try a different file.');
          return;
        }

        const wasTruncated = fileText.length > 5000;
        const truncated = wasTruncated ? fileText.slice(0, 5000) + '...' : fileText;
        if (wasTruncated) {
          Alert.alert(
            'Large Document',
            'This document is quite long — only the first portion will be sent to AI Chef. For best results, copy just the recipe section.',
          );
        }
        const docMessage = `[Attached document: ${asset.name}]\n\n${truncated}\n\nPlease extract any recipes from this document.`;
        setShowAttachments(false);
        onDocumentReady(docMessage);
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error('[useAttachments] Document picker error:', err);
      Alert.alert('Could Not Read Document', 'There was a problem reading the file. Try a different format (PDF or text).');
    }
  }, [setShowAttachments, onDocumentReady, onPdfExtraction]);

  return { pickImage, pickDocument };
}
