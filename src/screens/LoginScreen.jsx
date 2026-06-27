import React, { useState, useEffect, useRef } from 'react';
import { C } from '../components/consts';
import mabishionLogo from '../assets/Mabishion-logo.png';
import { setupPin, verifyPin, isPinSetup } from '../data/db.js';

export default function LoginScreen({ onUnlock }) {
  const [mode, setMode] = useState('checking'); // checking | setup | login | confirm
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    isPinSetup().then(setup => {
      setMode(setup ? 'login' : 'setup');
      setTimeout(() => inputRef.current?.focus(), 100);
    });
  }, []);

  const handlePinInput = (val) => {
    if (!/^\d*$/.test(val) || val.length > 6) return;
    setError('');
    if (mode === 'setup') setPin(val);
    else if (mode === 'confirm') setConfirmPin(val);
    else setPin(val);
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      if (mode === 'setup') {
        if (pin.length < 4) { setError('PIN kam se kam 4 digits ka hona chahiye'); setLoading(false); return; }
        setMode('confirm');
        setConfirmPin('');
        setTimeout(() => inputRef.current?.focus(), 100);
        setLoading(false);
        return;
      }

      if (mode === 'confirm') {
        if (pin !== confirmPin) { setError('PINs match nahi kar rahe. Dobara try karo.'); setConfirmPin(''); setLoading(false); return; }
        await setupPin(pin);
        onUnlock();
        return;
      }

      if (mode === 'login') {
        if (pin.length < 4) { setError('PIN daalo'); setLoading(false); return; }
        const { valid, firstTime } = await verifyPin(pin);
        if (firstTime || valid) {
          onUnlock();
        } else {
          setError('Galat PIN. Dobara try karo.');
          setPin('');
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (mode === 'checking') {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <p style={{ color: C.textMuted }}>Loading...</p>
      </div>
    );
  }

  const isSetupFlow = mode === 'setup' || mode === 'confirm';
  const currentPin = mode === 'confirm' ? confirmPin : pin;

  return (
    <div
      className="h-screen flex flex-col items-center justify-center gap-8 px-4"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <img src={mabishionLogo} alt="Mabishion" className="h-10 object-contain" style={{ filter: 'brightness(1.2)' }} />
        <div className="text-center">
          <h1 className="text-2xl font-black text-white tracking-tight">Mabishion AI</h1>
          <p className="text-xs mt-1" style={{ color: C.textMuted }}>Private Business Engine</p>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm p-8 rounded-3xl"
        style={{
          background: 'rgba(30,41,59,0.8)',
          border: '1px solid rgba(99,102,241,0.3)',
          boxShadow: '0 0 40px rgba(99,102,241,0.15)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}
          >
            <span className="text-2xl">{isSetupFlow ? '🔐' : '🔒'}</span>
          </div>
          <h2 className="text-lg font-black text-white">
            {mode === 'setup' && 'Set Your PIN'}
            {mode === 'confirm' && 'Confirm PIN'}
            {mode === 'login' && 'Welcome Back, Ashu'}
          </h2>
          <p className="text-xs mt-1" style={{ color: C.textMuted }}>
            {mode === 'setup' && '4-6 digit PIN set karo apne system ke liye'}
            {mode === 'confirm' && 'Same PIN dobara daalo confirm karne ke liye'}
            {mode === 'login' && 'Apna PIN daalo access ke liye'}
          </p>
        </div>

        {/* PIN dots display */}
        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-all duration-150"
              style={{
                background: i < currentPin.length
                  ? '#6366F1'
                  : 'rgba(255,255,255,0.15)',
                transform: i < currentPin.length ? 'scale(1.2)' : 'scale(1)',
                boxShadow: i < currentPin.length ? '0 0 8px rgba(99,102,241,0.8)' : 'none'
              }}
            />
          ))}
        </div>

        {/* Hidden number input */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={currentPin}
          onChange={e => handlePinInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 rounded-xl text-center text-white text-xl font-black tracking-[0.5em] outline-none border transition-all"
          style={{
            background: 'rgba(15,23,42,0.8)',
            border: error ? '1px solid #EF4444' : '1px solid rgba(99,102,241,0.4)',
            letterSpacing: '0.5em'
          }}
          placeholder="••••••"
          autoComplete="off"
        />

        {error && (
          <p className="mt-2 text-xs text-center text-red-400 font-bold">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || currentPin.length < 4}
          className="mt-4 w-full py-3 rounded-xl font-black text-white text-sm transition-all"
          style={{
            background: currentPin.length >= 4 ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(99,102,241,0.3)',
            cursor: currentPin.length >= 4 ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Verifying...' :
           mode === 'setup' ? 'Set PIN →' :
           mode === 'confirm' ? 'Confirm & Enter →' :
           'Unlock →'}
        </button>

        {mode === 'login' && (
          <p className="mt-4 text-center text-[10px]" style={{ color: C.textMuted }}>
            PIN bhool gaye? Settings mein jaake reset kar sakte ho.
          </p>
        )}
      </div>

      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Mabishion AI · Local-First · Encrypted
      </p>
    </div>
  );
}
