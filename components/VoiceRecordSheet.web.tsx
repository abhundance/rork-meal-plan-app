import React from 'react';
import { ExtractedRecipe } from '@/services/recipeExtraction';

type Props = {
  visible: boolean;
  onClose: () => void;
  onExtracted: (result: ExtractedRecipe) => void;
  onError: () => void;
};

export default function VoiceRecordSheet(_props: Props) {
  return null;
}
