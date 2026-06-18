import { databaseManagerLogic } from '@/logic/databaseManagerLogic.js';
import { authLogic } from '@/logic/authLogic.js';
import { userLogic } from '@/logic/userLogic.js';
import { roleLogic } from '@/logic/roleLogic.js';

export async function runIntegrationTest() {
  const steps = [];
  const log = (name, passed, details) => {
    steps.push({ name, passed, details });
    console.log(`[TEST] ${name}: ${passed ? 'PASS' : 'FAIL'} - ${details}`);
  };

  try {
    // 1. Clear Database / Reset
    await databaseManagerLogic.clearDatabase();
    log('Clear Database', true, 'Wiped all collections back to clean slate.');

    // 2. Install Schema
    const installRes = await databaseManagerLogic.install(null);
    if (!installRes.ok) throw new Error(installRes.error);
    log('Install Schema', true, 'Installed schema structures and seeded initial system roles.');

    // 3. Create Super Admin (Bootstrap)
    const bootstrapRes = await authLogic.bootstrapAdmin({
      name: 'Super Administrator',
      email: 'superadmin@lexai.local',
      password: 'SuperAdminPassword@123',
    });
    if (!bootstrapRes.ok) throw new Error(bootstrapRes.error);
    const adminUser = bootstrapRes.data.user;
    log('Create First Super Admin', true, `Successfully bootstrapped super admin: ${adminUser.email}`);

    // 4. Login
    const loginRes = await authLogic.login('superadmin@lexai.local', 'SuperAdminPassword@123');
    if (!loginRes.ok) throw new Error(loginRes.error);
    log('Login Admin', true, 'Admin logged in successfully.');

    // 5. Create Custom Role
    const roleRes = await roleLogic.create({
      name: 'Advocate Intern',
      code: 'advocate_intern',
      description: 'An intern role with limited access',
      permissions: ['cases.view', 'drafting.view', 'citations.view'],
    }, adminUser);
    if (!roleRes.ok) throw new Error(roleRes.error);
    log('Create Custom Role', true, 'Created new custom role "advocate_intern".');

    // 6. Create User
    const userRes = await userLogic.create({
      name: 'Jane Intern',
      email: 'jane@lexai.local',
      username: 'janeintern',
      roleCode: 'advocate_intern',
      password: 'InternPassword@123',
      status: 'Active',
    }, adminUser);
    if (!userRes.ok) throw new Error(userRes.error);
    const internUser = userRes.data;
    log('Create User', true, `Created user record linked to "advocate_intern" role: ${internUser.email}`);

    // 7. Logout
    await authLogic.logout(adminUser);
    log('Logout Admin', true, 'Admin logged out cleanly.');

    // 8. Login As User
    const userLoginRes = await authLogic.login('jane@lexai.local', 'InternPassword@123');
    if (!userLoginRes.ok) throw new Error(userLoginRes.error);
    const activeUser = userLoginRes.data.user;
    log('Login As User', true, `Logged in successfully as ${activeUser.name}.`);

    // Verify role assignment is active
    if (activeUser.roleCode !== 'advocate_intern') throw new Error('Role assignment verification failed.');
    log('Role Assignment Verification', true, `Confirmed roleCode matches "advocate_intern".`);

    // Clean up
    await authLogic.logout(activeUser);
    log('Clean Up', true, 'User logged out. Integration test suite completed successfully.');

    return { ok: true, steps };
  } catch (err) {
    log('Test Execution Failure', false, err.message);
    return { ok: false, steps, error: err.message };
  }
}

export default runIntegrationTest;
