// Step 008 — Foreign keys (runs after all application tables exist)
export const version = 8;
export const description = 'Create foreign key constraints via safe_create_fk';
export const sql = `
select safe_create_fk('reminders', 'caseId', 'cases', 'id', 'fk_reminders_case_id', 'CASCADE');
select safe_create_fk('notes', 'caseId', 'cases', 'id', 'fk_notes_case_id', 'CASCADE');
select safe_create_fk('hearings', 'caseId', 'cases', 'id', 'fk_hearings_case_id', 'CASCADE');
select safe_create_fk('drafts', 'caseId', 'cases', 'id', 'fk_drafts_case_id', 'CASCADE');
select safe_create_fk('documents', 'caseId', 'cases', 'id', 'fk_documents_case_id', 'CASCADE');
select safe_create_fk('caseHistory', 'caseId', 'cases', 'id', 'fk_case_history_case_id', 'CASCADE');
select safe_create_fk('caseFolders', 'caseId', 'cases', 'id', 'fk_case_folders_case_id', 'CASCADE');
select safe_create_fk('caseActivity', 'caseId', 'cases', 'id', 'fk_case_activity_case_id', 'CASCADE');
select safe_create_fk('auditLogs', 'userId', 'users', 'id', 'fk_audit_logs_user_id', 'SET NULL');
select safe_create_fk('users', 'roleCode', 'roles', 'code', 'fk_users_role_code', 'RESTRICT');
select safe_create_fk('caseFolders', 'parentId', 'caseFolders', 'id', 'fk_case_folders_parent_id', 'CASCADE');
`;
