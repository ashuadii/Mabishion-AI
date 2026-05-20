import React, { useState } from 'react';
import { addLead } from '../../data/db';
import { C, glassStyle } from '../consts';
import Icon from '../Icon';
import Button from '../Button';
import Badge from '../Badge';

export default function LeadForm({ onSubmitSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Meta Ads');
  const [budgetRange, setBudgetRange] = useState('$1,000 - $5,000');
  const [budgetCustom, setBudgetCustom] = useState('');
  const [timeline, setTimeline] = useState('1 Month');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState(null);
  const [submitLock, setSubmitLock] = useState(false); // debounce lock

  // Final budget value: custom overrides dropdown if filled
  const budget = budgetCustom.trim() ? `₹${budgetCustom.trim()}` : budgetRange;

  // Auto-scoring logic
  const calculateLeadScore = (selectedBudget, selectedTimeline, selectedSource) => {
    let score = 20; // baseline

    // Budget points (max 40)
    if (selectedBudget === '$10,000+') score += 40;
    else if (selectedBudget === '$5,000 - $10,000') score += 30;
    else if (selectedBudget === '$1,000 - $5,000') score += 20;
    else score += 10;

    // Timeline points (max 30)
    if (selectedTimeline === 'Urgent') score += 30;
    else if (selectedTimeline === '1 Month') score += 20;
    else score += 10;

    // Source points (max 10)
    if (['Referral', 'LinkedIn'].includes(selectedSource)) score += 10;
    else if (['Meta Ads', 'Google Ads', 'Website'].includes(selectedSource)) score += 8;
    else score += 5;

    return Math.min(score, 100);
  };

  const handleCalculateScore = () => {
    const score = calculateLeadScore(budget, timeline, source);
    setCalculatedScore(score);
    return score;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    // Debounce: prevent double-submit
    if (submitLock || isSubmitting) return;
    setSubmitLock(true);
    try {
      const score = calculateLeadScore(budget, timeline, source);
      const combinedNotes = JSON.stringify([
        {
          id: crypto.randomUUID(),
          text: notes.trim() || 'Lead captured via CRM Console.',
          timestamp: new Date().toISOString(),
          type: 'system'
        }
      ]);

      await addLead(
        name.trim(),
        email.trim(),
        phone.trim(),
        source,
        'New',
        score,
        budget,
        combinedNotes
      );

      // Reset
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
      setBudgetCustom('');
      setCalculatedScore(null);
      
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      console.error('[LeadForm] Error adding lead:', err);
    } finally {
      setIsSubmitting(false);
      // Release debounce lock after 1.5s
      setTimeout(() => setSubmitLock(false), 1500);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 rounded-3xl animate-in fade-in duration-300" style={glassStyle({ strong: true })}>
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <h3 className="font-black text-white text-lg flex items-center gap-2">
            <Icon name="person_add" className="text-violet-400" />
            Capture New Lead
          </h3>
          <p className="text-xs text-slate-400">Nexious autonomous intake scorer activated</p>
        </div>
        {calculatedScore !== null && (
          <div className="animate-bounce">
            <Badge tone={calculatedScore >= 70 ? 'success' : calculatedScore >= 40 ? 'warning' : 'info'}>
              Score: {calculatedScore}/100
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Full Name *</label>
          <input
            type="text"
            required
            placeholder="John Doe"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-violet-500 transition-all text-sm"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (calculatedScore !== null) handleCalculateScore();
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address *</label>
          <input
            type="email"
            required
            placeholder="john@example.com"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-violet-500 transition-all text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Phone Number</label>
          <input
            type="tel"
            placeholder="+1 (555) 000-0000"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-violet-500 transition-all text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Lead Source</label>
          <select
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white outline-none focus:border-violet-500 transition-all text-sm"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setCalculatedScore(calculateLeadScore(budget, timeline, e.target.value));
            }}
          >
            <option value="Meta Ads">Meta Ads</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Website">Website</option>
            <option value="Referral">Referral</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Cold Outreach">Cold Outreach</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Estimated Budget</label>
          <select
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white outline-none focus:border-violet-500 transition-all text-sm"
            value={budgetRange}
            onChange={(e) => {
              setBudgetRange(e.target.value);
              if (!budgetCustom) setCalculatedScore(calculateLeadScore(e.target.value, timeline, source));
            }}
          >
            <option value="<$1,000">&lt; $1,000</option>
            <option value="$1,000 - $5,000">$1,000 - $5,000</option>
            <option value="$5,000 - $10,000">$5,000 - $10,000</option>
            <option value="$10,000+">$10,000+</option>
          </select>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-semibold">OR enter exact ₹ amount:</span>
            <input
              type="number"
              min="0"
              placeholder="e.g. 75000"
              className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-violet-500 transition-all text-xs"
              value={budgetCustom}
              onChange={(e) => {
                setBudgetCustom(e.target.value);
                const val = e.target.value.trim() ? `₹${e.target.value}` : budgetRange;
                setCalculatedScore(calculateLeadScore(val, timeline, source));
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Project Timeline</label>
          <select
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white outline-none focus:border-violet-500 transition-all text-sm"
            value={timeline}
            onChange={(e) => {
              setTimeline(e.target.value);
              setCalculatedScore(calculateLeadScore(budget, e.target.value, source));
            }}
          >
            <option value="Urgent">Urgent (Immediate)</option>
            <option value="1 Month">1 Month</option>
            <option value="3 Months">3 Months</option>
            <option value="Flexible">Flexible (3+ Months)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Requirement Notes</label>
        <textarea
          rows={3}
          placeholder="Client wants custom AI integration with landing page..."
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-violet-500 transition-all text-sm resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button
          type="button"
          variant="soft"
          onClick={handleCalculateScore}
          className="font-bold text-xs"
        >
          <Icon name="calculate" size={14} /> Calculate Score
        </Button>
        <Button
          type="submit"
          variant="solid"
          disabled={isSubmitting || submitLock}
          className="font-bold text-xs"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving Lead...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Icon name="save" size={14} /> Save Lead
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
