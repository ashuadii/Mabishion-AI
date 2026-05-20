// Mickii Decision Engine — Rule-based scoring, NO ML

export class DecisionEngine {
  // Lead scoring — blueprint ke hisaab se
  static scoreLead(lead) {
    let score = 0;

    // Budget clarity (25 points)
    if (lead.value && lead.value !== "" && lead.value !== "TBD") score += 25;

    // Requirement clarity (20 points)
    if (lead.requirement && lead.requirement.length > 15) score += 20;
    else if (lead.requirement && lead.requirement.length > 5) score += 10;

    // Response speed (20 points)
    const daysSince = this.daysSince(lead.lastContact || lead.created_at);
    if (daysSince <= 1) score += 20;
    else if (daysSince <= 3) score += 10;
    else score -= 10;

    // Source quality (20 points)
    const sourceWeights = { 
      Referral: 20, 
      Website: 15, 
      LinkedIn: 15, 
      WhatsApp: 10, 
      Instagram: 10, 
      Email: 10,
      Showroom: 18,
      Other: 5 
    };
    score += sourceWeights[lead.source] || 5;

    // Mood/Engagement (15 points)
    const moodWeights = { 
      Urgent: 15, 
      Positive: 10, 
      Curious: 5, 
      Neutral: 0, 
      Unsure: -5, 
      "Price sensitive": -5,
      Ghosted: -20 
    };
    score += moodWeights[lead.mood] || 0;

    return Math.max(0, Math.min(100, score));
  }

  static classifyHeat(score) {
    if (score >= 80) return "Hot";
    if (score >= 60) return "Warm";
    if (score >= 40) return "Cold";
    return "Dead";
  }

  // Project health assessment
  static assessProjectHealth(project) {
    const checks = [
      { condition: project.progress >= 90, weight: 20 },
      { condition: !project.blockers || project.blockers === 0, weight: 25 },
      { condition: !project.approvalsPending || project.approvalsPending === 0, weight: 20 },
      { condition: this.daysUntil(project.due_date) > 3, weight: 15 },
      { condition: project.health !== "Blocked", weight: 20 }
    ];

    const healthScore = checks.reduce((sum, check) => sum + (check.condition ? check.weight : 0), 0);

    if (healthScore >= 85) return { status: "Strong", color: "success", score: healthScore };
    if (healthScore >= 60) return { status: "Stable", color: "gold", score: healthScore };
    if (healthScore >= 40) return { status: "Needs Review", color: "violet", score: healthScore };
    return { status: "Blocked", color: "danger", score: healthScore };
  }

  // Approval risk — Golden Rule
  static assessRisk(actionType) {
    const HIGH_RISK = [
      "send_message", "publish", "deploy", "delete", 
      "spend", "contact_client", "send_email", "send_whatsapp"
    ];
    const MEDIUM_RISK = [
      "export", "update_price", "change_status", 
      "archive", "modify_template"
    ];

    if (HIGH_RISK.includes(actionType)) {
      return { 
        level: "High", 
        needsApproval: true, 
        reason: "External action — manual YES required (Golden Rule)" 
      };
    }
    if (MEDIUM_RISK.includes(actionType)) {
      return { 
        level: "Medium", 
        needsApproval: true, 
        reason: "Sensitive action — review recommended" 
      };
    }
    return { 
      level: "Low", 
      needsApproval: false, 
      reason: "Internal draft — safe to execute" 
    };
  }

  // Revenue insights
  static analyzeRevenue(projects, leads) {
    const pipeline = leads
      .filter(l => l.stage === "Negotiating" || l.stage === "Contacted")
      .reduce((sum, l) => sum + this.parseValue(l.value), 0);

    const hotLeads = leads.filter(l => l.heat === "Hot").length;
    const activeProjects = projects.filter(p => p.stage !== "Delivered / Archived").length;
    const blocked = projects.filter(p => p.health === "Blocked").length;

    return {
      pipelineValue: this.formatCurrency(pipeline),
      hotLeads,
      activeProjects,
      blocked,
      focusArea: blocked > 0 ? "Fix blockers first" : hotLeads > 0 ? "Convert hot leads" : "Generate new leads"
    };
  }

  // Helper methods
  static daysSince(dateStr) {
    if (!dateStr) return 999;
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  static daysUntil(dateStr) {
    if (!dateStr) return 999;
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((date - now) / (1000 * 60 * 60 * 24));
  }

  static parseValue(val) {
    if (!val) return 0;
    const num = parseFloat(val.replace(/[^0-9.]/g, ""));
    if (val.includes("K")) return num * 1000;
    if (val.includes("L")) return num * 100000;
    return num || 0;
  }

  static formatCurrency(num) {
    if (num >= 100000) return `₹${(num/100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num/1000).toFixed(1)}K`;
    return `₹${num}`;
  }
}
