import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import CommandPalette from './components/CommandPalette';

// Import all active screens
import DashboardScreen from './screens/DashboardScreen';
import SkillLibraryScreen from './screens/SkillLibraryScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import LeadsScreen from './screens/LeadsScreen';
import AutomationsScreen from './screens/AutomationsScreen';
import SalesMarketingHubScreen from './screens/SalesMarketingHubScreen';
import ReportsScreen from './screens/ReportsScreen';
import FinanceScreen from './screens/FinanceScreen';
import SettingsScreen from './screens/SettingsScreen';
import ResearchScreen from './screens/ResearchScreen';
import ApprovalCenterScreen from './screens/ApprovalCenterScreen';
import ClientsScreen from './screens/ClientsScreen';
import InvoicesScreen from './screens/InvoicesScreen';
import WorkerMonitorScreen from './screens/WorkerMonitorScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import KnowledgeBaseScreen from './screens/KnowledgeBaseScreen';
import LoginScreen from './screens/LoginScreen';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import ProductsScreen from './screens/ProductsScreen';
import { BuildProvider } from './context/BuildContext';

export default function App() {
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ctrl+K → open command palette
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNavigate = (id, state) => {
    navigate(`/${id}`, { state });
  };

  return (
    <BuildProvider>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Routes>
        <Route path="/" element={<DashboardScreen onNavigate={handleNavigate} />} />
        <Route path="/dashboard" element={<DashboardScreen onNavigate={handleNavigate} />} />
        <Route path="/login" element={<LoginScreen onUnlock={() => navigate('/dashboard')} />} />
        
        {/* Under the hood routes */}
        <Route path="/new-build" element={<ResearchScreen onNavigate={handleNavigate} />} />
        <Route path="/build-new" element={<ResearchScreen onNavigate={handleNavigate} />} />
        <Route path="/research" element={<ResearchScreen onNavigate={handleNavigate} />} />
        <Route path="/automations" element={<AutomationsScreen onNavigate={handleNavigate} />} />
        
        {/* Core Sidebar 8 items */}
        <Route path="/projects" element={<ProjectsScreen onNavigate={handleNavigate} />} />
        <Route path="/projects/:id" element={<ProjectDetailScreen onNavigate={handleNavigate} />} />
        <Route path="/leads" element={<LeadsScreen onNavigate={handleNavigate} />} />
        <Route path="/marketing" element={<SalesMarketingHubScreen onNavigate={handleNavigate} />} />
        <Route path="/promotion" element={<SalesMarketingHubScreen onNavigate={handleNavigate} />} />
        <Route path="/sales" element={<SalesMarketingHubScreen onNavigate={handleNavigate} />} />
        <Route path="/sales-marketing" element={<SalesMarketingHubScreen onNavigate={handleNavigate} />} />
        <Route path="/approvals" element={<ApprovalCenterScreen onNavigate={handleNavigate} />} />
        <Route path="/revenue" element={<FinanceScreen onNavigate={handleNavigate} />} />
        <Route path="/finance" element={<FinanceScreen onNavigate={handleNavigate} />} />
        <Route path="/mickii-status" element={<SkillLibraryScreen onNavigate={handleNavigate} />} />
        <Route path="/system-monitor" element={<SkillLibraryScreen onNavigate={handleNavigate} />} />
        
        <Route path="/settings" element={<SettingsScreen onNavigate={handleNavigate} />} />
        <Route path="/analytics" element={<ReportsScreen onNavigate={handleNavigate} />} />

        {/* Tier 2 new screens */}
        <Route path="/clients" element={<ClientsScreen onNavigate={handleNavigate} />} />
        <Route path="/workers" element={<WorkerMonitorScreen onNavigate={handleNavigate} />} />
        <Route path="/worker-monitor" element={<WorkerMonitorScreen onNavigate={handleNavigate} />} />
        <Route path="/invoices" element={<InvoicesScreen onNavigate={handleNavigate} />} />
        <Route path="/finance/invoices" element={<InvoicesScreen onNavigate={handleNavigate} />} />
        <Route path="/documents" element={<DocumentsScreen onNavigate={handleNavigate} />} />
        <Route path="/knowledge" element={<KnowledgeBaseScreen onNavigate={handleNavigate} />} />
        <Route path="/products" element={<ProductsScreen onNavigate={handleNavigate} />} />
      </Routes>
    </BuildProvider>
  );
}
