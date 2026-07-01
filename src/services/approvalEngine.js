import {
  addApprovalExtended,
  getApprovalById,
  updateApprovalStatus,
  setApprovalWhatsAppSent,
  getPendingApprovals,
  getSetting,
  checkRateLimit
} from '../data/db.js';
import { WhatsAppService } from './whatsappService.js';
import { normalizeApprovalStatus, normalizeApprovalType, normalizeWorkerId } from '../utils/approvalRouting.js';

let isIntervalRunning = false;

export const ApprovalEngine = {
  /**
   * Initializes listeners and background auto-expire cron job
   */
  initialize() {
    console.log('[ApprovalEngine] Initializing bridge engine...');
    
    // Register WhatsApp message webhook listener
    WhatsAppService.onMessage(this.handleIncomingWhatsAppMessage.bind(this));
    
    // Start standard auto-approve background scanner (every 30 seconds for test responsiveness)
    if (!isIntervalRunning) {
      setInterval(() => {
        this.runExpiryCheck();
      }, 30000);
      isIntervalRunning = true;
      console.log('[ApprovalEngine] Expiry scanner started: STANDARD→CRITICAL escalation after 24h. CRITICAL: no timeout.');
    }
  },

  /**
   * Primary interface for workers to request approvals
   */
  async requestApproval(title, type, projectId, workerName, requestData) {
    const approvalType = normalizeApprovalType(type);
    const workerId = normalizeWorkerId(workerName);
    console.log(`[ApprovalEngine] New Approval Requested: "${title}" | Type: ${approvalType} | Worker: ${workerId}`);

    // HAF-007: Rate limit — max 10 approval requests per minute
    const allowed = await checkRateLimit('approval_request', 10).catch(() => true);
    if (!allowed) {
      console.warn('[ApprovalEngine] HAF-007: Rate limit hit — 10 approval requests/min exceeded');
      throw new Error('Too many approval requests. Please wait 60 seconds before submitting again.');
    }
    
    // C2: AUTO-APPROVED tier — log-only, no human gate required
    if (approvalType === 'auto_approved') {
      const approvalId = await addApprovalExtended(title, 'auto_approved', projectId, workerId, requestData, null);
      await updateApprovalStatus(approvalId, 'auto_approved', 'System auto-approved — no human gate required.');
      console.log(`[ApprovalEngine] Auto-approved (log-only): "${title}" | Worker: ${workerId}`);
      return approvalId;
    }

    const now = new Date();
    // C1: CRITICAL has no timeout (null = stays pending until owner acts)
    // STANDARD expires after 24h then escalates to CRITICAL (C3)
    const expiresAt = approvalType === 'critical' ? null : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    // Undo window: 24h from creation for all approvals
    const undoDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    // Cost impact: derive from requestData if available (store in paise)
    const costImpact = requestData?.amount ? Math.round(Number(requestData.amount) * 100) : null;
    // Compliance impact note
    const complianceImpact = approvalType === 'critical' ? 'Requires owner review before external action' : null;

    // 1. Save pending approval to SQLite
    const approvalId = await addApprovalExtended(title, approvalType, projectId, workerId, requestData, expiresAt);

    // 1b. Backfill new Tier 1 fields via separate UPDATE (safe — columns added by ALTER)
    try {
      const { getDb } = await import('../data/db.js');
      const db = await getDb();
      await db.execute(
        `UPDATE approvals SET cost_impact = $1, compliance_impact = $2, undo_deadline = $3 WHERE id = $4`,
        [costImpact, complianceImpact, undoDeadline, approvalId]
      );
    } catch (fieldErr) {
      console.warn('[ApprovalEngine] Tier 1 field update skipped (non-blocking):', fieldErr.message);
    }

    // 2. Outbound Alert Dispatch
    if (approvalType === 'critical') {
      this.triggerAudioBeep();
      this.triggerBrowserNotification(title, workerId);

      // Fetch owner's WhatsApp number
      const phone = await getSetting('wa_personal_number') || await getSetting('whatsapp_owner_phone') || '919876543210';
      
      try {
        const amount = requestData?.amount || requestData?.budget || 'N/A';
        await WhatsAppService.sendTemplate(phone, 'CRITICAL', {
          worker_name: workerId,
          project_name: title,
          amount,
          id: approvalId
        });
        await setApprovalWhatsAppSent(approvalId);
      } catch (err) {
        console.warn('[ApprovalEngine] WhatsApp critical alert fail (using in-app fallbacks):', err);
      }
    }

    return approvalId;
  },

  /**
   * Inbound WhatsApp Webhook Processor
   */
  async handleIncomingWhatsAppMessage(message) {
    const text = message.body ? message.body.trim() : '';
    const phone = message.from;
    
    // Regex: Match "APPROVE 123-abc" or "REJECT 123-abc"
    const match = text.match(/^\s*(APPROVE|REJECT)\s+([a-f0-9a-fA-F-]+|[0-9a-zA-Z-]+)\s*$/i);
    
    if (!match) {
      // Invalid structure, reply with guidance help instructions
      const helpMsg = `❓ Mabishion Help: Command not recognized.\n\nReply in exact format:\n👉 *APPROVE [id]*\n👉 *REJECT [id]*`;
      try {
        await WhatsAppService.sendMessage(phone, helpMsg);
      } catch (e) {
        console.error('[ApprovalEngine] Webhook fallback help reply failed:', e);
      }
      return;
    }

    const command = match[1].toUpperCase();
    const approvalId = match[2];

    console.log(`[ApprovalEngine Webhook] Action parsed: COMMAND=${command}, ID=${approvalId}`);

    // Fetch approval record
    const approval = await getApprovalById(approvalId);

    if (!approval) {
      const errorMsg = `❌ Error: Approval ID "${approvalId}" does not exist in Mabishion database registry.`;
      try {
        await WhatsAppService.sendMessage(phone, errorMsg);
      } catch (e) {}
      return;
    }

    if (normalizeApprovalStatus(approval.status) !== 'pending') {
      const warnMsg = `⚠️ Status Alert: Approval ID "${approvalId}" is already resolved as "${approval.status}".`;
      try {
        await WhatsAppService.sendMessage(phone, warnMsg);
      } catch (e) {}
      return;
    }

    // Resolve approval
    const finalStatus = normalizeApprovalStatus(command === 'APPROVE' ? 'approved' : 'rejected');
    const notes = `Resolved remotely via Outbound WhatsApp Webhook Command.`;
    
    await updateApprovalStatus(approvalId, finalStatus, notes);

    // Send confirmation back to WhatsApp owner
    try {
      if (finalStatus === 'approved') {
        await WhatsAppService.sendTemplate(phone, 'APPROVED', {
          project_name: approval.title,
          worker_name: approval.worker_name
        });
      } else {
        await WhatsAppService.sendTemplate(phone, 'REJECTED', {
          project_name: approval.title,
          owner_notes: notes
        });
      }
    } catch (e) {
      console.error('[ApprovalEngine Webhook] Outbound confirmation failed:', e);
    }
  },

  /**
   * Background cron expiration task
   * C1: CRITICAL has no expiry (expires_at = null) — never auto-rejected
   * C3: STANDARD after 24h escalates to CRITICAL, does NOT auto-approve
   */
  async runExpiryCheck() {
    try {
      const pendings = await getPendingApprovals();
      const now = new Date();

      for (const app of pendings) {
        // C1: Skip items with no expiry (CRITICAL approvals)
        if (!app.expires_at) continue;

        const expiresAt = new Date(app.expires_at);
        if (now > expiresAt && app.type === 'standard') {
          // C3: Escalate STANDARD → CRITICAL instead of auto-approving
          console.log(`[ApprovalEngine Expiry Scanner] Escalating STANDARD→CRITICAL: ID=${app.id} ("${app.title}")`);
          try {
            const { getDb } = await import('../data/db.js');
            const db = await getDb();
            await db.execute(
              `UPDATE approvals SET type = 'critical', expires_at = NULL WHERE id = $1`,
              [app.id]
            );
          } catch (dbErr) {
            console.error('[ApprovalEngine Expiry Scanner] Escalation DB update failed:', dbErr);
            continue;
          }
          // Re-alert owner via WhatsApp as CRITICAL
          const phone = await getSetting('wa_personal_number') || await getSetting('whatsapp_owner_phone') || '919876543210';
          try {
            await WhatsAppService.sendTemplate(phone, 'CRITICAL', {
              worker_name: app.worker_name || app.worker_id,
              project_name: app.title,
              amount: 'Escalated from STANDARD — requires immediate action',
              id: app.id
            });
          } catch (waErr) {
            console.warn('[ApprovalEngine Expiry Scanner] WhatsApp escalation alert failed (in-app only):', waErr);
          }
          this.triggerAudioBeep();
          this.triggerBrowserNotification(`[ESCALATED] ${app.title}`, app.worker_name || app.worker_id);
        }
      }
    } catch (err) {
      console.error('[ApprovalEngine Expiry Scanner] Error checking expirations:', err);
    }
  },

  /**
   * Play standard warning alert sound
   */
  triggerAudioBeep() {
    try {
      // Standard synthetic Web Audio beep
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Triple alert beep pattern
      const playBeep = (delay, pitch, duration) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
          
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start();
          osc.stop(audioCtx.currentTime + duration);
        }, delay);
      };

      playBeep(0, 880, 0.25);
      playBeep(300, 880, 0.25);
      playBeep(600, 1200, 0.4);
    } catch (e) {
      console.warn('[ApprovalEngine] Web Audio Beep failed:', e);
    }
  },

  /**
   * Triggers native browser push notifications
   */
  triggerBrowserNotification(title, workerName) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(`🚨 CRITICAL ACTION REQUIRED`, {
        body: `Worker "${workerName}" requires your immediate approval for: "${title}"`,
        icon: '/assets/mickii-avatar.png'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(`🚨 CRITICAL ACTION REQUIRED`, {
            body: `Worker "${workerName}" requires your immediate approval for: "${title}"`,
            icon: '/assets/mickii-avatar.png'
          });
        }
      });
    }
  }
};
