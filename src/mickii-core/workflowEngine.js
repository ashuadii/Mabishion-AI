// Mickii Workflow Engine — Node-based execution, NO external AI

const WORKFLOWS = {
  "lead_to_project": {
    name: "Lead to Project Conversion",
    nodes: [
      { id: "trigger", type: "Trigger", check: (data) => data.leadStage === "Closed Won" },
      { id: "create_card", type: "Action", run: (data) => ({ 
        projectId: generateId(), 
        name: `${data.leadName} - Project`,
        type: data.projectType || "Website",
        stage: "Research"
      })},
      { id: "attach_brief", type: "Action", run: (data) => ({
        brief: data.requirement,
        clientId: data.leadId,
        source: "Converted from lead"
      })},
      { id: "route_builder", type: "Router", 
        routes: [
          { test: (data) => data.projectType === "Website", target: "website_builder" },
          { test: (data) => data.projectType === "Automation", target: "automation_builder" },
          { default: true, target: "generic_project" }
        ]
      },
      { id: "approval_gate", type: "Approval", 
        message: "Client ko welcome message bhejna hai?" 
      },
      { id: "log_result", type: "Log" }
    ]
  },

  "delivery_pack": {
    name: "Client Delivery Pack",
    nodes: [
      { id: "trigger", type: "Trigger", check: (data) => data.projectStage === "Ready" },
      { id: "export_files", type: "Action", run: (data) => ({
        files: ["index.html", "styles.css", "assets/"],
        path: `exports/${data.projectId}`
      })},
      { id: "generate_guide", type: "Action", run: (data) => ({
        guide: `## ${data.projectName} Delivery Guide\n\nFiles included...`,
        filename: "README.md"
      })},
      { id: "create_invoice", type: "Action", run: (data) => ({
        draft: true,
        amount: data.price,
        status: "Draft — needs approval"
      })},
      { id: "approval_gate", type: "Approval", 
        message: "Delivery pack client ko bhejna hai?" 
      },
      { id: "log_result", type: "Log" }
    ]
  }
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function executeWorkflow(workflowId, inputData, onApprovalNeeded) {
  const workflow = WORKFLOWS[workflowId];
  if (!workflow) return { status: "error", reason: "Workflow not found" };

  const state = { ...inputData };
  const logs = [];
  let currentNodeIndex = 0;

  while (currentNodeIndex < workflow.nodes.length) {
    const node = workflow.nodes[currentNodeIndex];
    logs.push({ node: node.id, type: node.type, timestamp: new Date().toISOString() });

    switch (node.type) {
      case "Trigger":
        if (!node.check(state)) {
          return { status: "blocked", reason: `Trigger condition failed at ${node.id}`, logs };
        }
        currentNodeIndex++;
        break;

      case "Action":
        const result = node.run(state);
        Object.assign(state, result);
        currentNodeIndex++;
        break;

      case "Router":
        const route = node.routes.find(r => r.default || (r.test && r.test(state)));
        if (!route) {
          return { status: "blocked", reason: "No matching route", logs };
        }
        // In real implementation, route to different workflow
        currentNodeIndex++;
        break;

      case "Approval":
        return { 
          status: "pending_approval", 
          node: node.id,
          message: node.message,
          state,
          logs,
          onApprove: () => onApprovalNeeded("yes", state),
          onReject: () => onApprovalNeeded("no", state)
        };

      case "Log":
        return { 
          status: "completed", 
          state, 
          logs,
          summary: `Workflow ${workflowId} completed with ${logs.length} steps`
        };
    }
  }

  return { status: "completed", state, logs };
}

export function getWorkflowList() {
  return Object.entries(WORKFLOWS).map(([id, wf]) => ({
    id,
    name: wf.name,
    nodeCount: wf.nodes.length
  }));
}
