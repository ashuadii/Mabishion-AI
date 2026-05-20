// Mickii Intent Router — NO LLM, pure pattern matching

const INTENTS = [
  {
    id: "create_project",
    patterns: [
      /(?:nayi?|new|create|ban|start|shuru)\s+(?:website|landing|app|project|automation|proposal)/i,
      /(?:client|for)\s+([A-Z][a-zA-Z\s]+)\s+(?:ke\s+liye|k\s+liye)?\s+(?:website|landing|app)/i,
      /project\s+(?:ban|create|start)/i,
      /(?:website|landing)\s+(?:ban|build|create)/i,
    ],
    action: "PROJECT_CREATE",
    slots: ["projectType", "clientName", "goal"],
    responseKey: "project_created"
  },
  {
    id: "check_revenue",
    patterns: [
      /(?:aaj|today)\s+(?:paisa|revenue|income|money|business)/i,
      /money\s+move/i,
      /(?:kitna|how\s+much)\s+(?:kamai|earning)/i,
      /(?:business|sell)\s+(?:kya|kaise|status)/i,
      /(?:dashboard|overview|status)/i,
    ],
    action: "DASHBOARD_BRIEF",
    slots: [],
    responseKey: "revenue_brief"
  },
  {
    id: "lead_priority",
    patterns: [
      /(?:lead|client)\s+(?:score|priority|important|garam|hot)/i,
      /(?:kaun|kon)\s+(?:sa|se)\s+(?:lead|client)\s+(?:garam|hot|warm)/i,
      /(?:follow[-\s]?up|followup)\s+(?:kise|kis|kaun)/i,
      /(?:next|aage)\s+(?:action|step|kya)/i,
    ],
    action: "LEAD_ANALYZE",
    slots: ["leadId"],
    responseKey: "lead_battlecard"
  },
  {
    id: "add_section",
    patterns: [
      /(?:hero|pricing|testimonial|faq|cta|features|contact|about|services)\s+(?:section|block|part)/i,
      /(?:section|block)\s+(?:add|daal|lag)/i,
      /(?:upar|niche|bich)\s+(?:mein|me)\s+(?:section|part)/i,
    ],
    action: "BUILDER_ADD_SECTION",
    slots: ["sectionType", "position"],
    responseKey: "section_added"
  },
  {
    id: "export_project",
    patterns: [
      /(?:export|download|save|nikal)\s+(?:file|project|website|code)/i,
      /(?:client|isko)\s+(?:ko|ke\s+liye)\s+(?:bhej|send|export)/i,
      /(?:zip|package|pack)\s+(?:ban|create)/i,
    ],
    action: "PROJECT_EXPORT",
    slots: ["projectId"],
    responseKey: "export_ready"
  },
  {
    id: "template_load",
    patterns: [
      /(?:template|blueprint|starter)\s+(?:load|use|lag)/i,
      /(?:fitness|coach|real[-\s]?estate|agency|restaurant)\s+(?:template|site|page)/i,
      /(?:niche|category)\s+(?:select|choose|pick)/i,
    ],
    action: "TEMPLATE_LOAD",
    slots: ["category", "templateId"],
    responseKey: "template_loaded"
  },
  {
    id: "approve_action",
    patterns: [
      /(?:yes|haan|ok|done|approve|confirm)\s+(?:send|publish|deploy|bhej)/i,
      /(?:yes|haan)\s+(?:kar|do|de)/i,
      /(?:approve|confirm)\s+(?:action|this|request)/i,
    ],
    action: "APPROVAL_YES",
    slots: ["approvalId"],
    responseKey: "approved"
  },
  {
    id: "reject_action",
    patterns: [
      /(?:no|nahi|reject|cancel|ruk|stop|mat)/i,
      /(?:na|nahi)\s+(?:kar|bhej|publish)/i,
    ],
    action: "APPROVAL_NO",
    slots: ["approvalId"],
    responseKey: "rejected"
  },
  {
    id: "morning_brief",
    patterns: [
      /(?:morning|subah|start|shuru)\s+(?:brief|update|plan|focus)/i,
      /(?:aaj|today)\s+(?:ka|ki)\s+(?:plan|focus|priority)/i,
      /(?:mickii|system)\s+(?:status|update|kya\s+hai)/i,
    ],
    action: "MORNING_BRIEF",
    slots: [],
    responseKey: "morning_brief"
  },
  {
    id: "help_general",
    patterns: [
      /(?:help|madad|kya\s+kar\s+sakta|capabilities|features)/i,
      /(?:mickii|tum)\s+(?:kya|kaise)\s+(?:karte|kam)/i,
    ],
    action: "SHOW_HELP",
    slots: [],
    responseKey: "help_response"
  }
];

function extractSlots(input, requiredSlots) {
  const slots = {};
  const lower = input.toLowerCase();

  // Client name extraction
  const clientMatch = input.match(/(?:client|for|to|ko)\s+([A-Z][a-zA-Z\s]{2,20})(?:\s|$|ke)/i);
  if (clientMatch) slots.clientName = clientMatch[1].trim();

  // Project type
  const typePatterns = {
    website: /website|site/,
    landing: /landing/,
    app: /app|software/,
    automation: /automation|workflow|n8n/,
    proposal: /proposal|pitch/,
  };
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(lower)) { slots.projectType = type; break; }
  }

  // Section type
  const sectionPatterns = {
    hero: /hero|banner|top/,
    pricing: /pricing|price|cost/,
    testimonial: /testimonial|review|proof/,
    faq: /faq|question/,
    cta: /cta|call\s*to\s*action/,
    features: /feature|benefit/,
    contact: /contact|form/,
    about: /about|story/,
    services: /service|offer/,
  };
  for (const [type, pattern] of Object.entries(sectionPatterns)) {
    if (pattern.test(lower)) { slots.sectionType = type; break; }
  }

  // Template category
  const nichePatterns = {
    fitness: /fitness|gym|health/,
    coach: /coach|mentor|consult/,
    realestate: /real[-\s]?estate|property|home/,
    agency: /agency|digital|marketing/,
    restaurant: /restaurant|food|cafe/,
  };
  for (const [niche, pattern] of Object.entries(nichePatterns)) {
    if (pattern.test(lower)) { slots.category = niche; break; }
  }

  return slots;
}

export function parseIntent(userInput, context = {}) {
  const lowerInput = userInput.toLowerCase().trim();

  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(userInput)) {
        const slots = extractSlots(userInput, intent.requiredSlots);
        return {
          intent: intent.id,
          action: intent.action,
          slots,
          confidence: "high",
          responseKey: intent.responseKey,
          raw: userInput
        };
      }
    }
  }

  // Context-aware fallback
  return {
    intent: "unknown",
    action: "CONTEXT_HELP",
    slots: { lastScreen: context.activeScreen || "dashboard" },
    confidence: "low",
    responseKey: "clarification_needed",
    raw: userInput
  };
}

export function getSuggestedCommands(context) {
  const suggestions = {
    dashboard: [
      "Aaj ka revenue check karo",
      "Morning brief do",
      "Sabse garam lead kaun sa hai?",
      "Naya website project ban"
    ],
    projects: [
      "Fitness website template load karo",
      "Hero section add karo",
      "Project export karo",
      "Client ke liye proposal ban"
    ],
    leads: [
      "James Carter ka score check karo",
      "Warm leads list do",
      "Follow-up draft ban",
      "Lead ko project mein convert karo"
    ],
    command: [
      "Morning brief",
      "Aaj kya important hai",
      "System status check"
    ]
  };

  return suggestions[context] || suggestions.dashboard;
}
