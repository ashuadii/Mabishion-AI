// Mickii Response Engine — NO LLM, template-based NLG

const RESPONSES = {
  project_created: {
    hinglish: [
      "✅ **{projectType}** project create ho gaya Adii. Client: **{clientName}**. Stage: **{stage}**. Ab builder open karoon?",
      "Done. **{clientName}** ke liye **{projectType}** ka blueprint ready. Next step: {nextStep}.",
      "Factory floor pe **{projectType}** aa gaya. Priority: **{priority}**. {suggestedAction}"
    ]
  },
  revenue_brief: {
    hinglish: [
      "📊 Adii, aaj ka scene:

• Pipeline: **{pipelineValue}**
• Hot leads: **{hotLeads}**
• Pending: **{pendingValue}**

💰 Best move: **{topAction}**",
      "Reality check:
Income: **{monthRevenue}** | Expense: **{monthExpense}** | Margin: **{margin}%**

Focus: **{focusArea}**"
    ]
  },
  lead_battlecard: {
    hinglish: [
      "🔥 **{leadName}** — Score: **{score}/100**

Mood: {mood} | Budget: {budgetStatus}

**Approach:** {approach}

**Next:** {nextAction}",
      "Ye lead {heat} hai. Requirement: {requirement}

Best pitch: {battleCard}"
    ]
  },
  section_added: {
    hinglish: [
      "✅ **{sectionType}** section add ho gaya.

Preview canvas mein dekh lo. Edit karna ho toh right panel se kar sakte ho.",
      "Section daal diya **{position}** pe. Professional English copy draft karoon?"
    ]
  },
  export_ready: {
    hinglish: [
      "📦 Export ready hai!

Location: **{exportPath}**
Files: {fileCount}

Client ko bhejne se pehle preview check karo.",
      "Package ban gaya. **{projectName}** ke saari files organized hain. Manual YES required for client delivery."
    ]
  },
  template_loaded: {
    hinglish: [
      "🎨 **{templateName}** template load ho gaya.

Niche: {category}
Sections: {sectionCount}

Ab customize karo ya direct export?",
      "Blueprint ready: **{templateName}**. Ismein {sectionCount} sections hain. Client name daalke start karo."
    ]
  },
  approved: {
    hinglish: [
      "✅ Approved. Action execute ho raha hai...

Logged in action ledger. Rollback available if needed.",
      "YES recorded. Mickii executing now. No going back without manual undo."
    ]
  },
  rejected: {
    hinglish: [
      "❌ Rejected. Action cancelled.

Reason saved for future learning. Alternative suggest karoon?",
      "Nahi kiya. Safe mode maintained. Aap chahein toh edit karke dobara request kar sakte ho."
    ]
  },
  morning_brief: {
    hinglish: [
      "🌅 Good morning Adii!

Aaj ka plan:
1. **{topPriority}**
2. **{secondPriority}**
3. **{thirdPriority}**

Pipeline: **{pipelineStatus}** | Focus: **{focusArea}**",
      "Subah ka update:
• Pending approvals: **{pendingApprovals}**
• Active projects: **{activeProjects}**
• Hot leads: **{hotLeads}**

Pehle kya karna hai?"
    ]
  },
  help_response: {
    hinglish: [
      "🤖 Mickii capabilities:

**Projects:** Website, landing, app, automation, proposal ban sakta hoon
**Leads:** Score, prioritize, follow-up draft, convert to project
**Templates:** Niche-based blueprints load karo
**Export:** Client delivery pack create karo
**Approvals:** Har risky action pe manual YES required

Bas Hinglish mein command do!",
      "Main Adii ka operational brain hoon. Kya chahiye?
• Naya project?
• Lead check?
• Template load?
• Export files?
• Morning brief?"
    ]
  },
  clarification_needed: {
    hinglish: [
      "Adii, thoda aur clear batao? Main samajh nahi paaya exact.

Aap **{contextHint}** screen pe ho. Kya karna hai?

1. Naya {suggestion1}?
2. {suggestion2}?
3. {suggestion3}?",
      "Command clear nahi hui. Kya aap:
• {suggestion1} kar rahe ho?
• Ya {suggestion2}?
• Ya {suggestion3}?"
    ]
  }
};

export function generateResponse(key, data = {}, language = "hinglish") {
  const templates = RESPONSES[key];
  if (!templates) {
    return "Mickii: Command received. Processing locally... (NO LLM used)";
  }

  const pool = templates[language] || templates.hinglish;
  const template = pool[Math.floor(Math.random() * pool.length)];

  // Variable substitution with fallback
  return template.replace(/\*\*(\w+)\*\*/g, (match, varName) => {
    return data[varName] !== undefined ? data[varName] : `[${varName}]`;
  }).replace(/\{(\w+)\}/g, (match, varName) => {
    return data[varName] !== undefined ? data[varName] : `[${varName}]`;
  });
}

export function formatHinglish(text) {
  // Simple formatting for readability
  return text
    .replace(/•/g, "
•")
    .replace(/\d\./g, "
$&")
    .trim();
}
