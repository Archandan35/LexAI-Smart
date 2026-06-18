import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout.jsx';
import RequireAuth from '@/components/RequireAuth.jsx';

import Login from '@/app/pages/Login.jsx';
import ForgotPassword from '@/app/pages/ForgotPassword.jsx';
import AccessDenied from '@/app/pages/AccessDenied.jsx';

import Dashboard from '@/app/pages/Dashboard.jsx';
import DraftingStudio from '@/app/pages/DraftingStudio.jsx';
import CitationSearch from '@/app/pages/CitationSearch.jsx';
import CitationVerify from '@/app/pages/CitationVerify.jsx';
import LegalResearch from '@/app/pages/LegalResearch.jsx';
import CaseAnalysis from '@/app/pages/CaseAnalysis.jsx';
import StrategyEngine from '@/app/pages/StrategyEngine.jsx';
import CrossExamination from '@/app/pages/CrossExamination.jsx';
import EvidenceGap from '@/app/pages/EvidenceGap.jsx';
import DocumentReview from '@/app/pages/DocumentReview.jsx';
import TimelineBuilder from '@/app/pages/TimelineBuilder.jsx';
import HearingNotes from '@/app/pages/HearingNotes.jsx';
import CaseVault from '@/app/pages/CaseVault.jsx';
import CaseDetail from '@/app/pages/CaseDetail.jsx';
import CauseList from '@/app/pages/CauseList.jsx';
import CaseManage from '@/app/pages/CaseManage.jsx';
import NotFound from '@/app/pages/NotFound.jsx';

// Administration
import UserManagement from '@/app/pages/UserManagement.jsx';
import UserDetails from '@/app/pages/UserDetails.jsx';
import RoleManagement from '@/app/pages/RoleManagement.jsx';
import RoleDetails from '@/app/pages/RoleDetails.jsx';
import PermissionCenter from '@/app/pages/PermissionCenter.jsx';
import PermissionManager from '@/app/pages/PermissionManager.jsx';
import BackupManagement from '@/app/pages/BackupManagement.jsx';
import BackupHistory from '@/app/pages/BackupHistory.jsx';
import BackupSettings from '@/app/pages/BackupSettings.jsx';
import AuditLogs from '@/app/pages/AuditLogs.jsx';
import SystemSettings from '@/app/pages/SystemSettings.jsx';
import StorageSettings from '@/app/pages/StorageSettings.jsx';
import EnvApiManager from '@/app/pages/EnvApiManager.jsx';
import DatabaseManager from '@/app/pages/DatabaseManager.jsx';
import BootstrapAdmin from '@/app/pages/BootstrapAdmin.jsx';
import SecuritySettings from '@/app/pages/SecuritySettings.jsx';

// Guarded route helper.
const G = (module, element) => <RequireAuth module={module}>{element}</RequireAuth>;

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes (outside the app shell) */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/bootstrap-admin" element={<BootstrapAdmin />} />

      {/* Authenticated app shell */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/access-denied" element={<AccessDenied />} />

        <Route path="/" element={G('dashboard', <Dashboard />)} />
        <Route path="/drafting" element={G('drafting', <DraftingStudio />)} />
        <Route path="/citations" element={G('citations', <CitationSearch />)} />
        <Route path="/verify" element={G('verify', <CitationVerify />)} />
        <Route path="/research" element={G('research', <LegalResearch />)} />
        <Route path="/analysis" element={G('analysis', <CaseAnalysis />)} />
        <Route path="/strategy" element={G('strategy', <StrategyEngine />)} />
        <Route path="/cross-examination" element={G('crossExamination', <CrossExamination />)} />
        <Route path="/evidence" element={G('evidence', <EvidenceGap />)} />
        <Route path="/documents" element={G('documents', <DocumentReview />)} />
        <Route path="/timeline" element={G('timeline', <TimelineBuilder />)} />
        <Route path="/hearing-notes" element={G('hearingNotes', <HearingNotes />)} />
        <Route path="/cases" element={G('casevault', <CaseVault />)} />
        <Route path="/cases/:id" element={G('casevault', <CaseDetail />)} />
        <Route path="/cause-list" element={G('causeList', <CauseList />)} />
        <Route path="/case-manage" element={G('caseManage', <CaseManage />)} />

        {/* Administration */}
        <Route path="/admin/users" element={G('users', <UserManagement />)} />
        <Route path="/admin/users/:id" element={G('users', <UserDetails />)} />
        <Route path="/admin/roles" element={G('roles', <RoleManagement />)} />
        <Route path="/admin/roles/:id" element={G('roles', <RoleDetails />)} />
        <Route path="/admin/permissions" element={G('permissions', <PermissionCenter />)} />
        <Route path="/admin/permission-manager" element={G('permissions', <PermissionManager />)} />
        <Route path="/admin/backup" element={G('backup', <BackupManagement />)} />
        <Route path="/admin/backup/history" element={G('backup', <BackupHistory />)} />
        <Route path="/admin/backup/settings" element={G('backup', <BackupSettings />)} />
        <Route path="/admin/storage" element={G('storage', <StorageSettings />)} />
        <Route path="/admin/database" element={G('settings', <DatabaseManager />)} />
        <Route path="/admin/env-api" element={G('env', <EnvApiManager />)} />
        <Route path="/admin/audit" element={G('audit', <AuditLogs />)} />
        <Route path="/admin/settings" element={G('settings', <SystemSettings />)} />
        <Route path="/admin/security" element={G('settings', <SecuritySettings />)} />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
