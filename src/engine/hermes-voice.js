/**
 * Hermes Voice Engine — pure JS Web Speech integration.
 * Offers voice synthesization and continuous voice recognition for hands-free control.
 */

class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.selectedVoice = null;

    this.initRecognition();
    this.initVoices();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }

  initVoices() {
    if (!this.synthesis) return;
    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      // Try to get a high-quality Google voice or standard premium voice
      this.selectedVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.lang.startsWith('en-US')) || voices[0];
    };
    loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
  }

  isSupported() {
    return !!(this.recognition && this.synthesis);
  }

  startListening(onResult, onError) {
    if (!this.recognition) {
      if (onError) onError('Speech Recognition not supported in this browser.');
      return;
    }
    if (this.isListening) return;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (e) => {
      const text = e.results[e.results.length - 1][0].transcript;
      if (onResult) onResult(text);
    };

    this.recognition.onerror = (e) => {
      if (onError) onError(e.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto-restart if we want continuous listening, but let caller decide
    };

    try {
      this.recognition.start();
    } catch (err) {
      if (onError) onError(err.message);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  speak(text, onEnd, onStart) {
    if (!this.synthesis) return;
    // Cancel active speaks
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.pitch = 1.05;
    utterance.rate = 1.0;

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.error('TTS speech synthesis error:', e);
      if (onEnd) onEnd();
    };

    this.synthesis.speak(utterance);
  }

  cancel() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

export const hermesVoice = new VoiceEngine();
