// Sound effects for quiz feedback
// Using Web Audio API to generate sounds

export const soundEffects = {
  // Multiple success sounds
  successSounds: [
    { frequency: 800, duration: 150 }, // Beep 1
    { frequency: 900, duration: 100 }, // Beep 2
    { frequency: 1000, duration: 200 }, // Beep 3
  ] as const,

  // Multiple failure sounds
  failureSounds: [
    { frequency: 300, duration: 200 }, // Low beep 1
    { frequency: 250, duration: 250 }, // Low beep 2
    { frequency: 200, duration: 200 }, // Low beep 3
  ] as const,
};

// Create audio context
const getAudioContext = (): AudioContext => {
  if (typeof window === 'undefined') {
    throw new Error('Audio context only available in browser');
  }
  const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser');
  }
  return new AudioContextClass();
};

export const playSuccessSound = () => {
  try {
    const audioContext = getAudioContext();
    const soundIndex = Math.floor(
      Math.random() * soundEffects.successSounds.length
    );
    const { frequency, duration } =
      soundEffects.successSounds[soundIndex];

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration / 1000
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.error('Error playing success sound:', error);
  }
};

export const playFailureSound = () => {
  try {
    const audioContext = getAudioContext();
    const soundIndex = Math.floor(
      Math.random() * soundEffects.failureSounds.length
    );
    const { frequency, duration } = soundEffects.failureSounds[soundIndex];

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration / 1000
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.error('Error playing failure sound:', error);
  }
};
