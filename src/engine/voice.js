// ──────────────────────────────────────────────────────────────
// MICKII VOICE ENGINE — Text to Speech (Free / Web Standard)
// ──────────────────────────────────────────────────────────────

class VoiceEngine {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voice = null;
    this.enabled = true;
    
    if (this.synth) {
      // Find a good premium sounding voice if available
      const loadVoices = () => {
        const voices = this.synth.getVoices();
        this.voice = voices.find(v => v.name.includes('Google') || v.name.includes('Premium') || v.lang.includes('en-GB')) || voices[0];
      };
      
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = loadVoices;
      }
      loadVoices();
    }
  }

  speak(text) {
    if (!this.synth || !this.enabled) return;

    // Stop any current speaking
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.pitch = 1.0;
    utterance.rate = 1.1; // Slightly faster for a professional feel
    utterance.volume = 1.0;

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) this.synth.cancel();
  }
}

export const Voice = new VoiceEngine();
