// Step 008 — Foreign keys (runs after all application tables exist)
export const version = 8;
export const description = 'Create foreign key constraints via safe_create_fk';
export const sql = `
select safe_create_fk('reminders', 'case_id', 'cases', 'id', 'fk_reminders_case_id', 'CASCADE');
select safe_create_fk('notes', 'case_id', 'cases', 'id', 'fk_notes_case_id', 'CASCADE');
select safe_create_fk('hearings', 'case_id', 'cases', 'id', 'fk_hearings_case_id', 'CASCADE');
select safe_create_fk('drafts', 'case_id', 'cases', 'id', 'fk_drafts_case_id', 'CASCADE');
select safe_create_fk('documents', 'case_id', 'cases', 'id', 'fk_documents_case_id', 'CASCADE');
select safe_create_fk('caseHistory', 'case_id', 'cases', 'id', 'fk_case_history_case_id', 'CASCADE');
select safe_create_fk('caseFolders', 'case_id', 'cases', 'id', 'fk_case_folders_case_id', 'CASCADE');
select safe_create_fk('caseActivity', 'case_id', 'cases', 'id', 'fk_case_activity_case_id', 'CASCADE');
select safe_create_fk('auditLogs', 'user_id', 'users', 'id', 'fk_audit_logs_user_id', 'SET NULL');
select safe_create_fk('users', 'role_code', 'roles', 'code', 'fk_users_role_code', 'RESTRICT');
select safe_create_fk('caseFolders', 'parent_id', 'caseFolders', 'id', 'fk_case_folders_parent_id', 'CASCADE');
`;
