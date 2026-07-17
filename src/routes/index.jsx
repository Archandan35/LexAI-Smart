import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout.jsx';
import RequireAuth from '@/components/RequireAuth.jsx';
import { lazyWithRetry as lazy } from '@/utils/lazyWithRetry.js';

const Login = lazy(() => import('@/app/pages/Login.jsx'));
const Register = lazy(() => import('@/app/pages/Register.jsx'));
const ForgotPassword = lazy(() => import('@/app/pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('@/app/pages/ResetPassword.jsx'));
const VerifyAccount = lazy(() => import('@/app/pages/VerifyAccount.jsx'));
const AccessDenied = lazy(() => import('@/app/pages/AccessDenied.jsx'));
const TemplatesLibrary = lazy(() => import('@/app/pages/TemplatesLibrary.jsx'));
const LegalNotices = lazy(() => import('@/app/pages/LegalNotices.jsx'));
const VersionControl = lazy(() => import('@/app/pages/VersionControl.jsx'));
const DocumentArchive = lazy(() => import('@/app/pages/DocumentArchive.jsx'));
const Calendar = lazy(() => import('@/app/pages/Calendar.jsx'));
const Clients = lazy(() => import('@/app/pages/Clients.jsx'));
const Advocates = lazy(() => import('@/app/pages/Advocates.jsx'));
const Contacts = lazy(() => import('@/app/pages/Contacts.jsx'));
const Reminders = lazy(() => import('@/app/pages/Reminders.jsx'));
const CaseDocuments = lazy(() => import('@/app/pages/CaseDocuments.jsx'));
const ActLibrary = lazy(() => import('@/app/pages/ActLibrary.jsx'));
const JudgmentLibrary = lazy(() => import('@/app/pages/JudgmentLibrary.jsx'));
const JudgmentDetail = lazy(() => import('@/app/pages/JudgmentDetail.jsx'));
const PrecedentVault = lazy(() => import('@/app/pages/PrecedentVault.jsx'));
const CreateCase = lazy(() => import('@/app/pages/CreateCase.jsx'));

const Dashboard = lazy(() => import('@/app/pages/Dashboard.jsx'));
const DraftingStudio = lazy(() => import('@/app/pages/DraftingStudio.jsx'));
const CitationSearch = lazy(() => import('@/app/pages/CitationSearch.jsx'));
const CitationVerify = lazy(() => import('@/app/pages/CitationVerify.jsx'));
const LegalResearch = lazy(() => import('@/app/pages/LegalResearch.jsx'));
const CaseAnalysis = lazy(() => import('@/app/pages/CaseAnalysis.jsx'));
const StrategyEngine = lazy(() => import('@/app/pages/StrategyEngine.jsx'));
const CrossExamination = lazy(() => import('@/app/pages/CrossExamination.jsx'));
const EvidenceGap = lazy(() => import('@/app/pages/EvidenceGap.jsx'));
const DocumentReview = lazy(() => import('@/app/pages/DocumentReview.jsx'));
const CaseTimeline = lazy(() => import('@/app/pages/CaseTimeline.jsx'));
const HearingNotes = lazy(() => import('@/app/pages/HearingNotes.jsx'));
const ManageCases = lazy(() => import('@/app/pages/ManageCases.jsx'));
const CaseDetails = lazy(() => import('@/app/pages/CaseDetails.jsx'));
const OrderSheet = lazy(() => import('@/app/pages/OrderSheet.jsx'));

const NotFound = lazy(() => import('@/app/pages/NotFound.jsx'));

const UserManagement = lazy(() => import('@/app/pages/UserManagement.jsx'));
const UserDetails = lazy(() => import('@/app/pages/UserDetails.jsx'));
const RoleManagement = lazy(() => import('@/app/pages/RoleManagement.jsx'));
const RoleDetails = lazy(() => import('@/app/pages/RoleDetails.jsx'));
const PermissionManager = lazy(() => import('@/app/pages/PermissionManager.jsx'));
const StorageSettings = lazy(() => import('@/app/pages/StorageSettings.jsx'));
const EnvApiManager = lazy(() => import('@/app/pages/EnvApiManager.jsx'));
const SetupWizard = lazy(() => import('@/app/pages/SetupWizard.jsx'));
const AdminSetup = lazy(() => import('@/app/pages/AdminSetup.jsx'));
const SecuritySettings = lazy(() => import('@/app/pages/SecuritySettings.jsx'));
const SystemSettings = lazy(() => import('@/app/pages/SystemSettings.jsx'));
const CaseTypes = lazy(() => import('@/app/pages/CaseTypes.jsx'));
const AiAssistant = lazy(() => import('@/app/pages/AiAssistant.jsx'));
const PromptLibrary = lazy(() => import('@/app/pages/PromptLibrary.jsx'));
const AiUsage = lazy(() => import('@/app/pages/AiUsage.jsx'));
const CaseReports = lazy(() => import('@/app/pages/CaseReports.jsx'));
const CourtReports = lazy(() => import('@/app/pages/CourtReports.jsx'));
const UserActivity = lazy(() => import('@/app/pages/UserActivity.jsx'));
const BenchTypes = lazy(() => import('@/app/pages/BenchTypes.jsx'));
const Courts = lazy(() => import('@/app/pages/Courts.jsx'));
const Jurisdictions = lazy(() => import('@/app/pages/Jurisdictions.jsx'));
const CaseStages = lazy(() => import('@/app/pages/CaseStages.jsx'));
const Priorities = lazy(() => import('@/app/pages/Priorities.jsx'));
const CaseStatuses = lazy(() => import('@/app/pages/CaseStatuses.jsx'));
const JudgeList = lazy(() => import('@/app/pages/JudgeList.jsx'));
const PartyTypes = lazy(() => import('@/app/pages/PartyTypes.jsx'));
const PerformanceAnalytics = lazy(() => import('@/app/pages/PerformanceAnalytics.jsx'));
const CustomReports = lazy(() => import('@/app/pages/CustomReports.jsx'));
const DatabaseCenter = lazy(() => import('@/app/pages/database-center/DatabaseCenter.jsx'));
const DmcDashboard = lazy(() => import('@/app/pages/database-center/DmcDashboard.jsx'));
const DmcDataExplorer = lazy(() => import('@/app/pages/database-center/DmcDataExplorer.jsx'));
const DmcDeleteManager = lazy(() => import('@/app/pages/database-center/DmcDeleteManager.jsx'));
const DmcImportCenter = lazy(() => import('@/app/pages/database-center/DmcImportCenter.jsx'));
const DmcExportCenter = lazy(() => import('@/app/pages/database-center/DmcExportCenter.jsx'));
const DmcBackupRecovery = lazy(() => import('@/app/pages/database-center/DmcBackupRecovery.jsx'));
const DmcMaintenance = lazy(() => import('@/app/pages/database-center/DmcMaintenance.jsx'));
const DmcMigration = lazy(() => import('@/app/pages/database-center/DmcMigration.jsx'));
const DmcAuditActivity = lazy(() => import('@/app/pages/database-center/DmcAuditActivity.jsx'));
const TestDesignPage = lazy(() => import('@/app/pages/TestDesignPage.jsx'));

const G = (module, element) => <RequireAuth module={module}>{element}</RequireAuth>;

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="loading-block"><span className="spinner" /></div>}>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-account" element={<VerifyAccount />} />
      <Route path="/admin/setup" element={<AdminSetup />} />

      {/* Authenticated app shell */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* ── Dashboard ── */}
        <Route path="/dashboard" element={G('dashboard', <Dashboard />)} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ── Case Management ── */}
        <Route path="/cases/create" element={G('manageCase', <CreateCase />)} />
        <Route path="/cases/order-sheet" element={G('orderSheet', <OrderSheet />)} />
        <Route path="/cases/hearings" element={G('hearingNotes', <HearingNotes />)} />
        <Route path="/cases/case-timeline" element={G('timeline', <CaseTimeline />)} />
        <Route path="/cases" element={G('manageCase', <ManageCases />)} />
        <Route path="/cases/:id" element={G('manageCase', <CaseDetails />)} />
        <Route path="/reminders" element={G('manageCase', <Reminders />)} />

        {/* ── Calendar / Clients / Contacts ── */}
        <Route path="/calendar" element={G('calendar', <Calendar />)} />
        <Route path="/tasks" element={<Navigate to="/calendar" replace />} />
        <Route path="/clients" element={G('clients', <Clients />)} />
        <Route path="/advocates" element={G('clients', <Advocates />)} />
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

        {/* ── Knowledge Library ── */}
        <Route path="/research/act-library" element={G('research', <ActLibrary />)} />
        <Route path="/research/judgment-library" element={G('research', <JudgmentLibrary />)} />
        <Route path="/research/judgment-library/:id" element={G('research', <JudgmentDetail />)} />
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
        <Route path="/admin/security" element={G('settings', <SecuritySettings />)} />
        <Route path="/admin/env-api" element={G('env', <EnvApiManager />)} />
        <Route path="/admin/storage" element={G('storage', <StorageSettings />)} />
        <Route path="/admin/setup-wizard" element={G('admin', <SetupWizard />)} />

        {/* ── Database Management Center ── */}
        <Route path="/admin/database-center" element={G('admin', <DatabaseCenter />)}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DmcDashboard />} />
          <Route path="data-explorer" element={<DmcDataExplorer />} />
          <Route path="delete-manager" element={<DmcDeleteManager />} />
          <Route path="import" element={<DmcImportCenter />} />
          <Route path="export" element={<DmcExportCenter />} />
          <Route path="backup-recovery" element={<DmcBackupRecovery />} />
          <Route path="maintenance" element={<DmcMaintenance />} />
          <Route path="migration" element={<DmcMigration />} />
          <Route path="audit-activity" element={<DmcAuditActivity />} />
        </Route>

        {/* ── Old routes → DMC redirects ── */}
        <Route path="/admin/activity" element={<Navigate to="/admin/database-center/audit-activity" replace />} />
        <Route path="/admin/backup" element={<Navigate to="/admin/database-center/backup-recovery" replace />} />
        <Route path="/admin/backup/history" element={<Navigate to="/admin/database-center/backup-recovery" replace />} />
        <Route path="/admin/backup/settings" element={<Navigate to="/admin/database-center/backup-recovery" replace />} />
        <Route path="/admin/backup/restore" element={<Navigate to="/admin/database-center/backup-recovery" replace />} />
        <Route path="/admin/database" element={<Navigate to="/admin/database-center/dashboard" replace />} />
        <Route path="/admin/database/studio" element={<Navigate to="/admin/database-center/data-explorer" replace />} />
        <Route path="/admin/database/sql" element={<Navigate to="/admin/database-center/data-explorer" replace />} />
        <Route path="/admin/schema" element={<Navigate to="/admin/database-center/data-explorer" replace />} />
        <Route path="/admin/schema-mapping" element={<Navigate to="/admin/database-center/migration" replace />} />

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
        <Route path="/admin/audit" element={<Navigate to="/admin/database-center/audit-activity" replace />} />
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
    </Suspense>
  );
}
