import React, { useState, useEffect, useRef } from 'react';
import { C } from '../components/consts';
import Button from '../components/Button';
import Icon from '../components/Icon';
import mabishionMark from '../assets/mabishion-mark.svg';
import { setupPin, verifyPin, isPinSetup } from '../data/db.js';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

const ONBOARDING_STEPS = [
  { label: 'Strategy room', detail: 'Revenue model, offer ladder, and client segments mapped.' },
  { label: 'Build pipeline', detail: 'Research, proposal, development, review, and delivery gates aligned.' },
  { label: 'Operator safety', detail: 'External actions require approval before the system acts.' },
];

export default function LoginScreen({ onUnlock }) {
  const [mode, setMode] = useState('checking');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

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
        if (pin.length < 4) { setError('Use a 4 to 6 digit PIN.'); setLoading(false); return; }
        setMode('confirm');
        setConfirmPin('');
        setTimeout(() => inputRef.current?.focus(), 100);
        setLoading(false);
        return;
      }

      if (mode === 'confirm') {
        if (pin !== confirmPin) { setError('PINs do not match. Try again.'); setConfirmPin(''); setLoading(false); return; }
        await setupPin(pin);
        onUnlock();
        return;
      }

      if (mode === 'login') {
        if (pin.length < 4) { setError('Enter your PIN.'); setLoading(false); return; }

        if (lockedUntil && Date.now() < lockedUntil) {
          const remaining = Math.ceil((lockedUntil - Date.now()) / 1000 / 60);
          setError(`Locked for ${remaining} minute${remaining !== 1 ? 's' : ''}.`);
          setPin('');
          setLoading(false);
          return;
        }

        const { valid, firstTime } = await verifyPin(pin);
        if (firstTime || valid) {
          setFailedAttempts(0);
          setLockedUntil(null);
          onUnlock();
        } else {
          const newCount = failedAttempts + 1;
          setFailedAttempts(newCount);
          if (newCount >= MAX_ATTEMPTS) {
            setLockedUntil(Date.now() + LOCKOUT_MS);
            setError('Too many attempts. Locked for 5 minutes.');
          } else {
            setError(`Incorrect PIN. ${MAX_ATTEMPTS - newCount} attempts remaining.`);
          }
          setPin('');
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    } catch (err) {
      setError('Security check failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (mode === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: C.paper }}>
        <p className="text-sm font-semibold" style={{ color: C.textMuted }}>Opening secure workspace...</p>
      </div>
    );
  }

  const isSetupFlow = mode === 'setup' || mode === 'confirm';
  const currentPin = mode === 'confirm' ? confirmPin : pin;
  const title = mode === 'setup' ? 'Create your operator PIN' : mode === 'confirm' ? 'Confirm your operator PIN' : 'Welcome back';
  const subtitle = mode === 'login'
    ? 'Unlock the private business engineering OS.'
    : 'Protect approvals, client data, and delivery workflows on this device.';

  return (
    <main className="grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]" style={{ background: `linear-gradient(135deg, ${C.paper}, #fffaf0 48%, ${C.cream})` }}>
      <section className="flex min-h-0 flex-col justify-between px-8 py-8 lg:px-14 lg:py-12">
        <div className="flex items-center gap-4">
          <img src={mabishionMark} alt="" className="h-12 w-12" />
          <div>
            <h1 className="font-wordmark text-2xl uppercase" style={{ color: C.primary }}>Mabishion</h1>
            <p className="tagline text-[10px] font-bold" style={{ color: C.goldDeep }}>Architects of Ambition</p>
          </div>
        </div>

        <div className="max-w-3xl py-10">
          <p className="tagline mb-5 text-[11px] font-bold" style={{ color: C.goldDeep }}>Business Engineering OS</p>
          <h2 className="font-heading text-4xl leading-tight md:text-7xl" style={{ color: C.navyDeep }}>
            Build the business like a system.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8" style={{ color: C.textMuted }}>
            A calm operating room for offers, projects, approvals, analytics, and the disciplined work that turns ambition into shipped assets.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {ONBOARDING_STEPS.map((step, index) => (
            <div key={step.label} className="rounded-2xl border bg-white/60 p-5" style={{ borderColor: C.glassBorder }}>
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold" style={{ background: `${C.gold}22`, color: C.goldDeep }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="font-semibold" style={{ color: C.primary }}>{step.label}</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: C.textMuted }}>{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center border-l px-6 py-8" style={{ borderColor: C.glassBorder, background: 'rgba(255,255,255,.52)' }}>
        <div className="w-full max-w-md rounded-[28px] border bg-white/80 p-8 shadow-[0_28px_80px_rgba(27,46,58,.14)]" style={{ borderColor: C.glassBorder }}>
          <div className="mb-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${C.primary}10`, color: C.primary }}>
              <Icon name="lock" size={24} />
            </div>
            <h2 className="font-heading text-3xl" style={{ color: C.navyDeep }}>{title}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: C.textMuted }}>{subtitle}</p>
          </div>

          <label className="mb-2 block text-xs font-bold uppercase" htmlFor="operator-pin" style={{ color: C.textMuted }}>
            {mode === 'confirm' ? 'Confirm PIN' : 'Operator PIN'}
          </label>
          <input
            id="operator-pin"
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={currentPin}
            onChange={e => handlePinInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[54px] w-full rounded-2xl border bg-white px-4 text-center text-2xl font-bold outline-none transition-all"
            style={{ borderColor: error ? C.danger : C.glassBorder, color: C.primary, letterSpacing: '0.28em' }}
            placeholder="000000"
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'pin-error' : undefined}
          />

          <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 rounded-full transition-all"
                style={{ background: i < currentPin.length ? C.gold : 'rgba(36,59,74,.14)', transform: i < currentPin.length ? 'scale(1.18)' : 'scale(1)' }}
              />
            ))}
          </div>

          {error && <p id="pin-error" className="mt-4 text-sm font-semibold" style={{ color: C.danger }}>{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading || currentPin.length < 4}
            className="mt-6 w-full"
            icon={isSetupFlow ? 'shield' : 'lock'}
          >
            {loading ? 'Verifying' : mode === 'setup' ? 'Continue' : mode === 'confirm' ? 'Create secure workspace' : 'Unlock Mabishion'}
          </Button>

          <div className="mt-6 rounded-2xl border p-4 text-sm leading-6" style={{ borderColor: C.glassBorder, background: `${C.cream}66`, color: C.textMuted }}>
            Local-first access. Approval gates, credentials, and delivery records stay protected behind this device PIN.
          </div>
        </div>
      </section>
    </main>
  );
}
