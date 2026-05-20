import { useState, useCallback, useEffect } from 'react';

export function useMickiiEar(onTranscript) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US'; // Works surprisingly well with Hinglish too

      rec.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        if (event.results[0].isFinal) {
          onTranscript(transcript);
          setIsListening(false);
        }
      };

      rec.onerror = (event) => {
        console.error("Speech Recognition Error", event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [onTranscript]);

  const startListening = useCallback(() => {
    if (recognition) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    } else {
      alert("Speech recognition is not supported in this browser.");
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);

  return { isListening, startListening, stopListening };
}
