import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setCurrentTime } from '@/store/slices/playerSlice';
import { Chord } from '@/types/music';

interface UseAudioSyncProps {
  currentTime: number;
  chords: Chord[];
  onChordChange: (chordIndex: number) => void;
  tolerance?: number; // seconds
}

export const useAudioSync = ({
  currentTime,
  chords,
  onChordChange,
  tolerance = 0.1,
}: UseAudioSyncProps) => {
  const dispatch = useDispatch();
  const previousChordIndex = useRef<number>(-1);

  const syncPosition = useCallback(() => {
    if (!chords.length) return;

    const currentChordIndex = chords.findIndex(
      (chord) => 
        currentTime >= chord.startTime - tolerance &&
        currentTime < chord.startTime + chord.duration
    );

    if (currentChordIndex !== -1 && currentChordIndex !== previousChordIndex.current) {
      previousChordIndex.current = currentChordIndex;
      onChordChange(currentChordIndex);
    }
  }, [currentTime, chords, tolerance, onChordChange, dispatch]);

  useEffect(() => {
    syncPosition();
  }, [syncPosition]);

  return {
    syncPosition,
    currentChordIndex: previousChordIndex.current,
  };
};

export default useAudioSync;