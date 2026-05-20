import React, { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { C, glassStyle } from '../components/consts';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import QuickCommandBar from '../components/QuickCommandBar';

// Custom CSS to style React Flow glassmorphic nodes
const flowStyles = {
  background: 'rgba(15, 23, 42, 0.4)',
  width: '100%',
  height: '520px',
};

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Intake: Client Inquiry' },
    position: { x: 50, y: 200 },
    style: {
      background: 'rgba(99, 102, 241, 0.15)',
      color: '#fff',
      border: '1px solid rgba(99, 102, 241, 0.4)',
      borderRadius: '16px',
      padding: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      boxShadow: '0 0 15px rgba(99, 102, 241, 0.25)',
      backdropFilter: 'blur(10px)',
    },
  },
  {
    id: '2',
    data: { label: 'Analyze: Business Analyst' },
    position: { x: 220, y: 200 },
    style: {
      background: 'rgba(59, 130, 246, 0.15)',
      color: '#fff',
      border: '1px solid rgba(59, 130, 246, 0.4)',
      borderRadius: '16px',
      padding: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      boxShadow: '0 0 15px rgba(59, 130, 246, 0.25)',
      backdropFilter: 'blur(10px)',
    },
  },
  {
    id: '3',
    data: { label: 'Condition: Lead Score > 80' },
    position: { x: 390, y: 120 },
    style: {
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#fff',
      border: '1px solid rgba(245, 158, 11, 0.4)',
      borderRadius: '16px',
      padding: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      boxShadow: '0 0 15px rgba(245, 158, 11, 0.25)',
      backdropFilter: 'blur(10px)',
    },
  },
  {
    id: '4',
    data: { label: 'Fast Track: Proposal Maker' },
    position: { x: 570, y: 50 },
    style: {
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#fff',
      border: '1px solid rgba(16, 185, 129, 0.4)',
      borderRadius: '16px',
      padding: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      boxShadow: '0 0 15px rgba(16, 185, 129, 0.25)',
      backdropFilter: 'blur(10px)',
    },
  },
  {
    id: '5',
    data: { label: 'Loop: Retry 3x if Failed' },
    position: { x: 570, y: 280 },
    style: {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#fff',
      border: '1px solid rgba(239, 68, 68, 0.4)',
      borderRadius: '16px',
      padding: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      boxShadow: '0 0 15px rgba(239, 68, 68, 0.25)',
      backdropFilter: 'blur(10px)',
    },
  },
  {
    id: '6',
    type: 'output',
    data: { label: 'Deliver: Packager Worker' },
    position: { x: 760, y: 200 },
    style: {
      background: 'rgba(168, 85, 247, 0.15)',
      color: '#fff',
      border: '1px solid rgba(168, 85, 247, 0.4)',
      borderRadius: '16px',
      padding: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      boxShadow: '0 0 15px rgba(168, 85, 247, 0.25)',
      backdropFilter: 'blur(10px)',
    },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#818CF8' } },
  { id: 'e2-3', source: '2', target: '3', label: 'Evaluate score', style: { stroke: '#F59E0B' } },
  { id: 'e3-4', source: '3', target: '4', label: 'Score > 80', style: { stroke: '#10B981' } },
  { id: 'e3-5', source: '3', target: '5', label: 'Score <= 80', style: { stroke: '#EF4444' } },
  { id: 'e4-6', source: '4', target: '6', animated: true, style: { stroke: '#A78BFA' } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#A78BFA' } },
];

export default function AutomationsScreen({ onNavigate }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeWorkflow, setActiveWorkflow] = useState('Client Acquisition Pipeline');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState('');

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const addWorkerNode = (workerType) => {
    const id = (nodes.length + 1).toString();
    let name = `${workerType} Node`;
    let color = 'rgba(99, 102, 241, 0.15)';
    let border = 'rgba(99, 102, 241, 0.4)';

    if (workerType === 'Lead Gen') {
      name = 'Lead Gen Worker';
      color = 'rgba(6, 182, 212, 0.15)';
      border = 'rgba(6, 182, 212, 0.4)';
    } else if (workerType === 'Proposal') {
      name = 'Proposal Maker';
      color = 'rgba(16, 185, 129, 0.15)';
      border = 'rgba(16, 185, 129, 0.4)';
    } else if (workerType === 'Packager') {
      name = 'Packager Worker';
      color = 'rgba(168, 85, 247, 0.15)';
      border = 'rgba(168, 85, 247, 0.4)';
    }

    const newNode = {
      id,
      data: { label: name },
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      style: {
        background: color,
        color: '#fff',
        border: `1px solid ${border}`,
        borderRadius: '16px',
        padding: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        backdropFilter: 'blur(10px)',
        boxShadow: `0 0 15px ${border.replace('0.4', '0.25')}`,
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const simulateWorkflow = async () => {
    setIsSimulating(true);
    setSimStep('🔄 Step 1: Starting Intake stage...');
    await new Promise((r) => setTimeout(r, 1200));

    setSimStep('🔍 Step 2: Passing context to Business Analyst...');
    await new Promise((r) => setTimeout(r, 1200));

    setSimStep('⚡ Step 3: Checking conditional branch "Lead Score > 80"...');
    await new Promise((r) => setTimeout(r, 1200));

    setSimStep('📋 Step 4: Routing to Proposal Maker worker...');
    await new Promise((r) => setTimeout(r, 1200));

    setSimStep('📦 Step 5: Fast Track triggered! Delivering ZIP build package.');
    await new Promise((r) => setTimeout(r, 1200));

    setSimStep('✅ Simulation complete successfully.');
    setIsSimulating(false);
  };

  return (
    <AppShell
      activeNavId="automations"
      onNavigate={onNavigate}
      commandBar={
        <QuickCommandBar
          contextLabel="Workflow Context"
          placeholder="Ask Mickii: plan workflow, add approval gate, retry failed task, or inspect knowledge sources..."
        />
      }
    >
      <ScreenHeader
        title="Visual Flow Builder"
        index="07"
        subtitle="n8n/make-style visual drag-and-drop workflow node editor. Backend workers automatically coordinate in the SQLite runtime."
        badgeLabel="Vite v5 · React Flow Engine"
        primaryAction="New Workflow"
        primaryIcon="plus"
        secondaryAction="Reset Layout"
        secondaryIcon="refresh"
        extraBadges={
          <>
            <Badge tone="cyan">React Flow v11</Badge>
            <Badge tone="gold">Conditional Branching</Badge>
            <Badge tone="violet">Loop Retry</Badge>
          </>
        }
      />

      <section className="grid grid-cols-12 gap-5">
        {/* Drag & Drop Tool Box */}
        <div className="col-span-12 lg:col-span-3 space-y-5">
          <div className="p-5" style={glassStyle({ glow: 'violet' })}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black text-sm">Flow Workspaces</h3>
              <Badge tone="violet">Active</Badge>
            </div>
            <div className="space-y-2">
              {[
                'Client Acquisition Pipeline',
                'Landing Page Manufacturing',
                'Email Lead Nurture Loop',
              ].map((flow) => (
                <button
                  key={flow}
                  onClick={() => setActiveWorkflow(flow)}
                  className="w-full text-left p-3 rounded-2xl text-xs font-black transition-all hover:bg-white/5"
                  style={{
                    backgroundColor: activeWorkflow === flow ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,.02)',
                    border: `1px solid ${activeWorkflow === flow ? 'rgba(99, 102, 241, 0.4)' : C.glassBorder}`,
                  }}
                >
                  {flow}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5" style={glassStyle({ glow: 'cyan' })}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black text-sm">Drag-Drop Workers</h3>
              <Badge tone="cyan">Inject</Badge>
            </div>
            <p className="text-[11px] mb-3" style={{ color: C.mutedLow }}>
              Click to inject new custom worker nodes straight into the dynamic flow canvas:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addWorkerNode('Lead Gen')}
                className="p-3 text-[11px] font-black rounded-2xl border text-center transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)' }}
              >
                Lead Gen
              </button>
              <button
                onClick={() => addWorkerNode('Business Analyst')}
                className="p-3 text-[11px] font-black rounded-2xl border text-center transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}
              >
                Analyst
              </button>
              <button
                onClick={() => addWorkerNode('Proposal')}
                className="p-3 text-[11px] font-black rounded-2xl border text-center transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
              >
                Proposal
              </button>
              <button
                onClick={() => addWorkerNode('Packager')}
                className="p-3 text-[11px] font-black rounded-2xl border text-center transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.3)' }}
              >
                Packager
              </button>
            </div>
          </div>

          <div className="p-5" style={glassStyle({ glow: 'gold' })}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-black text-sm">Simulation Desk</h3>
              <Badge tone={isSimulating ? 'gold' : 'muted'}>{isSimulating ? 'Running' : 'Ready'}</Badge>
            </div>
            <div className="space-y-3">
              <Button onClick={simulateWorkflow} className="w-full">
                <Icon name="play" size={15} /> Simulate Flow
              </Button>
              {simStep && (
                <div
                  className="p-3 text-[11px] leading-5 rounded-2xl font-mono"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${C.glassBorder}` }}
                >
                  {simStep}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* React Flow Editor Workspace */}
        <div className="col-span-12 lg:col-span-9 p-5" style={glassStyle({ strong: true, glow: 'violet' })}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-black">{activeWorkflow}</h3>
              <p className="text-[11px]" style={{ color: C.mutedLow }}>
                Click nodes to edit properties. Connect handles to map operational execution sequences.
              </p>
            </div>
            <Badge tone="cyan">{nodes.length} Nodes Loaded</Badge>
          </div>

          <div className="relative rounded-3xl overflow-hidden" style={{ border: `1px solid ${C.glassBorder}` }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              style={flowStyles}
              fitView
            >
              <Controls />
              <MiniMap
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                nodeColor={() => 'rgba(99,102,241,0.5)'}
              />
              <Background color="rgba(255,255,255,0.15)" gap={16} size={1} />
            </ReactFlow>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
