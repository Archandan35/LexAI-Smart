# Integration Test Report

This report documents the execution of the automated integration tests in `src/utils/integrationTest.js`.

The test covers the full system setup lifecycle.

## Test Log & Results

| Step | Test Description | Status | Details |
| :--- | :--- | :--- | :--- |
| **1** | **Clear Database** | **PASS** | Successfully wiped all collections on the active DatabaseProvider. |
| **2** | **Install Schema** | **PASS** | Ensured collections exist and populated system roles (`super_admin`, `admin`, `advocate`, `clerk` templates). |
| **3** | **Create Super Admin** | **PASS** | Bootstrapped initial `super_admin` user without hardcoded credentials. |
| **4** | **Login Admin** | **PASS** | Authenticated as the newly created super admin, retrieving and restoring session successfully. |
| **5** | **Create Custom Role** | **PASS** | Programmatically created `advocate_intern` role with custom permission lists. |
| **6** | **Create User** | **PASS** | Created a new user `jane@lexai.local` and assigned the custom role. |
| **7** | **Logout Admin** | **PASS** | Terminated admin session. |
| **8** | **Login As User** | **PASS** | Authenticated as `jane@lexai.local` using GoTrue REST/local credentials and confirmed correct role/permissions were resolved. |
| **9** | **Logout User** | **PASS** | Terminated user session. |

### Overall Summary
*   **Result**: 100% Success
*   **Failed Steps**: 0
*   **Fixed Steps**: N/A
