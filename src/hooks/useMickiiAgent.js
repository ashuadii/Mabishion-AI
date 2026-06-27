import { useState, useCallback, useRef, useEffect } from 'react';
import { Cortex } from '../engine/cortex.js';
import { Voice } from '../engine/voice.js';
import { SearchService } from '../services/searchService.js';
import { getDailyCostTotal } from '../data/db.js';

/**
 * useMickiiAgent Hook
 * Manages the connection between the React UI and the autonomous Cortex.
 */
export function useMickiiAgent(config = {}) {
  const cortex = useRef(new Cortex(config));
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | thinking | acting | error
  const [dailyCostPaise, setDailyCostPaise] = useState(0);

  // Poll cost every 60s to keep amber banner fresh
  useEffect(() => {
    const fetchCost = async () => {
      try { setDailyCostPaise(await getDailyCostTotal()); } catch (_) {}
    };
    fetchCost();
    const timer = setInterval(fetchCost, 60000);
    return () => clearInterval(timer);
  }, []);

  const send = useCallback(async (userText) => {
    if (!userText.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    setStatus('thinking');

    const activeSearches = [];

    try {
      const response = await cortex.current.think(userText, {
        onToolStart: (meta) => {
          setStatus('acting');
          // Add a subtle system log to the message stream
          setMessages(prev => [...prev, { 
            id: `tool-${Date.now()}`, 
            role: 'system', 
            content: `⚙️ Mickii is using **${meta.name}**...`,
            isSystem: true 
          }]);
        },
        onToolEnd: (meta) => {
          setStatus('thinking');
          if (meta.name === 'mickii_web_search') {
            const logs = SearchService.getSearchLogs();
            if (logs.length > 0) {
              const matchingLog = logs.find(l => l.query === meta.args?.query);
              if (matchingLog) activeSearches.push(matchingLog);
              else activeSearches.push(logs[0]);
            }
          }
        }
      });

      // Final response
      const finalMsg = {
        id: Date.now() + 1,
        role: 'mickii',
        content: response.content,
        searchTelemetry: activeSearches.length > 0 ? activeSearches[0] : null,
        hallucinationWarning: response._hallucinationWarning || false,
        hallucinationNote: response._hallucinationNote || null,
      };
      setMessages(prev => [...prev, finalMsg]);
      
      // MICKII SPEAKS!
      Voice.speak(response.content);

      setStatus('idle');

    } catch (err) {
      console.error("Agent Error:", err);
      setStatus('error');

      // Cost limit reached — show a clear, actionable message
      if (err.code === 'COST_LIMIT_EXCEEDED') {
        const spentRupees = ((err.dailyTotal || 0) / 100).toFixed(2);
        setMessages(prev => [...prev, {
          id: `cost-block-${Date.now()}`,
          role: 'error',
          content: `⚠️ **AG-CFO: Daily limit reached.**\n\nAaj ka AI kharcha ₹${spentRupees} ho gaya (limit: ₹150). Kal subah limit reset hogi.\n\nAbhi ke liye:\n• Settings mein Ollama (local, free) set karo\n• Ya kal dobara try karo`,
          isCostBlock: true
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'error',
          content: `Mickii Error: ${err.message}. Please check your API keys and internet connection.`
        }]);
      }
    }
  }, []);

  const reset = useCallback(() => {
    cortex.current.reset();
    setMessages([]);
    setStatus('idle');
  }, []);

  // AG-CFO warning level derived from daily cost
  const costWarningLevel = dailyCostPaise >= 15000 ? 'blocked' : dailyCostPaise >= 12000 ? 'warning' : 'ok';

  return {
    messages,
    send,
    reset,
    status,
    isProcessing: status === 'thinking' || status === 'acting',
    dailyCostPaise,
    costWarningLevel,
  };
}
