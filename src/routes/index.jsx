import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout.jsx';
import RequireAuth from '@/components/RequireAuth.jsx';

import Login from '@/app/pages/Login.jsx';
import Register from '@/app/pages/Register.jsx';
import ForgotPassword from '@/app/pages/ForgotPassword.jsx';
import ResetPassword from '@/app/pages/ResetPassword.jsx';
import VerifyAccount from '@/app/pages/VerifyAccount.jsx';
import AccessDenied from '@/app/pages/AccessDenied.jsx';
import TemplatesLibrary from '@/app/pages/TemplatesLibrary.jsx';
import LegalNotices from '@/app/pages/LegalNotices.jsx';
import VersionControl from '@/app/pages/VersionControl.jsx';
import DocumentArchive from '@/app/pages/DocumentArchive.jsx';
import Calendar from '@/app/pages/Calendar.jsx';
import Clients from '@/app/pages/Clients.jsx';
import Contacts from '@/app/pages/Contacts.jsx';
import CaseDocuments from '@/app/pages/CaseDocuments.jsx';
import ActLibrary from '@/app/pages/ActLibrary.jsx';
import JudgmentLibrary from '@/app/pages/JudgmentLibrary.jsx';
import PrecedentVault from '@/app/pages/PrecedentVault.jsx';
import CreateCase from '@/app/pages/CreateCase.jsx';

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
import CaseTimeline from '@/app/pages/CaseTimeline.jsx';
import HearingNotes from '@/app/pages/HearingNotes.jsx';
import ManageCases from '@/app/pages/ManageCases.jsx';
import ManageCase from '@/app/pages/ManageCase.jsx';
import CauseList from '@/app/pages/CauseList.jsx';

import NotFound from '@/app/pages/NotFound.jsx';

import UserManagement from '@/app/pages/UserManagement.jsx';
import UserDetails from '@/app/pages/UserDetails.jsx';
import RoleManagement from '@/app/pages/RoleManagement.jsx';
import RoleDetails from '@/app/pages/RoleDetails.jsx';
import PermissionManager from '@/app/pages/PermissionManager.jsx';
import BackupManagement from '@/app/pages/BackupManagement.jsx';
import BackupHistory from '@/app/pages/BackupHistory.jsx';
import BackupSettings from '@/app/pages/BackupSettings.jsx';
import AuditLogs from '@/app/pages/AuditLogs.jsx';
import StorageSettings from '@/app/pages/StorageSettings.jsx';
import EnvApiManager from '@/app/pages/EnvApiManager.jsx';
import DatabaseManager from '@/app/pages/DatabaseManager.jsx';
import BootstrapAdmin from '@/app/pages/BootstrapAdmin.jsx';
import SecuritySettings from '@/app/pages/SecuritySettings.jsx';
import SystemSettings from '@/app/pages/SystemSettings.jsx';
import CaseTypes from '@/app/pages/CaseTypes.jsx';
import AiAssistant from '@/app/pages/AiAssistant.jsx';
import PromptLibrary from '@/app/pages/PromptLibrary.jsx';
import AiUsage from '@/app/pages/AiUsage.jsx';
import CaseReports from '@/app/pages/CaseReports.jsx';
import CourtReports from '@/app/pages/CourtReports.jsx';
import UserActivity from '@/app/pages/UserActivity.jsx';
import BenchTypes from '@/app/pages/BenchTypes.jsx';
import Courts from '@/app/pages/Courts.jsx';
import Jurisdictions from '@/app/pages/Jurisdictions.jsx';
import CaseStages from '@/app/pages/CaseStages.jsx';
import Priorities from '@/app/pages/Priorities.jsx';
import CaseStatuses from '@/app/pages/CaseStatuses.jsx';
import JudgeList from '@/app/pages/JudgeList.jsx';
import PartyTypes from '@/app/pages/PartyTypes.jsx';
import SchemaManager from '@/app/pages/SchemaManager.jsx';
import SchemaMappingManager from '@/app/pages/SchemaMappingManager.jsx';
import DatabaseStudio from '@/app/pages/DatabaseStudio.jsx';
import SqlConsole from '@/app/pages/SqlConsole.jsx';
import RestoreCenter from '@/app/pages/RestoreCenter.jsx';
import PerformanceAnalytics from '@/app/pages/PerformanceAnalytics.jsx';
import CustomReports from '@/app/pages/CustomReports.jsx';
import TestDesignPage from '@/app/pages/TestDesignPage.jsx';

const G = (module, element) => <RequireAuth module={module}>{element}</RequireAuth>;

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-account" element={<VerifyAccount />} />
      <Route path="/bootstrap-admin" element={<BootstrapAdmin />} />

      {/* Authenticated app shell */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* ── Dashboard ── */}
        <Route path="/dashboard" element={G('dashboard', <Dashboard />)} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ── Case Management ── */}
        <Route path="/cases/create" element={G('casevault', <CreateCase />)} />
        <Route path="/cases/cause-list" element={G('causeList', <CauseList />)} />
        <Route path="/cases/hearings" element={G('hearingNotes', <HearingNotes />)} />
        <Route path="/cases/case-timeline" element={G('timeline', <CaseTimeline />)} />
        <Route path="/cases" element={G('casevault', <ManageCases />)} />
        <Route path="/cases/:id" element={G('casevault', <ManageCase />)} />

        {/* ── Calendar / Clients / Contacts ── */}
        <Route path="/calendar" element={G('calendar', <Calendar />)} />
        <Route path="/tasks" element={<Navigate to="/calendar" replace />} />
        <Route path="/clients" element={G('clients', <Clients />)} />
        <Route path="/contacts" element={G('contacts', <Contacts />)} />

        {/* ── Drafting Center ── */}
        <Route path="/drafting" element={G('drafting', <DraftingStudio />)} />
        <Route path="/drafting/templates" element={G('drafting', <TemplatesLibrary />)} />
        <Route path="/drafting/legal-notices" element={G('drafting', <LegalNotices />)} />
        <Route path="/drafting/version-control" element={G('drafting', <VersionControl />)} />
        <Route path="/drafting/archive" element={G('drafting', <DocumentArchive />)} />

        {/* ── Document Center ── */}
        <Route path="/documents/review" element={G('documents', <DocumentReview />)} />
        <Route path="/documents" element={G('caseManage', <CaseDocuments />)} />

        {/* ── Research & Analysis ── */}
        <Route path="/research/citations" element={G('citations', <CitationSearch />)} />
        <Route path="/research/citation-verify" element={G('verify', <CitationVerify />)} />
        <Route path="/research/case-analysis" element={G('analysis', <CaseAnalysis />)} />
        <Route path="/research/strategy" element={G('strategy', <StrategyEngine />)} />
        <Route path="/research/cross-examination" element={G('crossExamination', <CrossExamination />)} />
        <Route path="/research/evidence-gap" element={G('evidence', <EvidenceGap />)} />
        <Route path="/research/act-library" element={G('research', <ActLibrary />)} />
        <Route path="/research/judgment-library" element={G('research', <JudgmentLibrary />)} />
        <Route path="/research/precedent-vault" element={G('research', <PrecedentVault />)} />
        <Route path="/research" element={G('research', <LegalResearch />)} />

        {/* ── Court Management ── */}
        <Route path="/court-management/courts" element={G('courtTypes', <Courts />)} />
        <Route path="/court-management/bench-types" element={G('courtTypes', <BenchTypes />)} />
        <Route path="/court-management/case-types" element={G('caseTypes', <CaseTypes />)} />
        <Route path="/court-management/jurisdictions" element={G('courtTypes', <Jurisdictions />)} />
        <Route path="/court-management/case-stages" element={G('courtTypes', <CaseStages />)} />
        <Route path="/court-management/priorities" element={G('courtTypes', <Priorities />)} />
        <Route path="/court-management/case-statuses" element={G('courtTypes', <CaseStatuses />)} />
        <Route path="/court-management/judges" element={G('courtTypes', <JudgeList />)} />
        <Route path="/court-management/party-types" element={G('courtTypes', <PartyTypes />)} />

        {/* ── Administration ── */}
        <Route path="/admin/users" element={G('users', <UserManagement />)} />
        <Route path="/admin/users/:id" element={G('users', <UserDetails />)} />
        <Route path="/admin/roles-permissions" element={<Navigate to="/admin/roles" replace />} />
        <Route path="/admin/activity" element={G('audit', <AuditLogs />)} />
        <Route path="/admin/backup" element={G('backup', <BackupManagement />)} />
        <Route path="/admin/backup/history" element={G('backup', <BackupHistory />)} />
        <Route path="/admin/backup/settings" element={G('backup', <BackupSettings />)} />
        <Route path="/admin/backup/restore" element={G('backup', <RestoreCenter />)} />
        <Route path="/admin/storage" element={G('storage', <StorageSettings />)} />
        <Route path="/admin/database" element={G('settings', <DatabaseManager />)} />
        <Route path="/admin/database/studio" element={G('settings', <DatabaseStudio />)} />
        <Route path="/admin/database/sql" element={G('settings', <SqlConsole />)} />
        <Route path="/admin/schema" element={G('schema', <SchemaManager />)} />
        <Route path="/admin/schema-mapping" element={G('settings', <SchemaMappingManager />)} />
        <Route path="/admin/security" element={G('settings', <SecuritySettings />)} />
        <Route path="/admin/env-api" element={G('env', <EnvApiManager />)} />

        {/* ── Tools ── */}
        <Route path="/test-design" element={<TestDesignPage />} />
        <Route path="/tools/ai" element={G('drafting', <AiAssistant />)} />
        <Route path="/tools/ai/prompts" element={G('drafting', <PromptLibrary />)} />
        <Route path="/tools/ai/usage" element={G('drafting', <AiUsage />)} />
        <Route path="/tools/reports/cases" element={G('reports', <CaseReports />)} />
        <Route path="/tools/reports/courts" element={G('reports', <CourtReports />)} />
        <Route path="/tools/reports/activity" element={G('reports', <UserActivity />)} />
        <Route path="/tools/reports/ai-usage" element={G('reports', <AiUsage />)} />
        <Route path="/tools/reports/performance" element={G('reports', <PerformanceAnalytics />)} />
        <Route path="/tools/reports/custom" element={G('reports', <CustomReports />)} />

        {/* ── System Settings ── */}
        <Route path="/settings" element={G('settings', <SystemSettings />)} />

        {/* ── Redirects (old paths → new paths) ── */}
        <Route path="/cause-list" element={<Navigate to="/cases/cause-list" replace />} />
        <Route path="/case-manage" element={<Navigate to="/cases" replace />} />
        <Route path="/hearing-notes" element={<Navigate to="/cases/hearings" replace />} />
        <Route path="/timeline" element={<Navigate to="/cases/case-timeline" replace />} />
        <Route path="/citations" element={<Navigate to="/research/citations" replace />} />
        <Route path="/verify" element={<Navigate to="/research/citation-verify" replace />} />
        <Route path="/analysis" element={<Navigate to="/research/case-analysis" replace />} />
        <Route path="/strategy" element={<Navigate to="/research/strategy" replace />} />
        <Route path="/cross-examination" element={<Navigate to="/research/cross-examination" replace />} />
        <Route path="/evidence" element={<Navigate to="/research/evidence-gap" replace />} />
        <Route path="/admin/court-types" element={<Navigate to="/court-management/courts" replace />} />
        <Route path="/court-management/hierarchy" element={<Navigate to="/court-management/courts" replace />} />
        <Route path="/admin/case-types" element={<Navigate to="/court-management/case-types" replace />} />
        <Route path="/admin/audit" element={<Navigate to="/admin/activity" replace />} />
        <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />

        {/* Admin sub-routes that still exist */}
        <Route path="/admin/roles" element={G('roles', <RoleManagement />)} />
        <Route path="/admin/roles/:id" element={G('roles', <RoleDetails />)} />
        <Route path="/admin/permissions" element={<Navigate to="/admin/permission-manager" replace />} />
        <Route path="/admin/permission-manager" element={G('permissions', <PermissionManager />)} />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
