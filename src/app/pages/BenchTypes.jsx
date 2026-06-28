import EntityListPage from '@/components/EntityListPage.jsx';
import { benchTypeLogic } from '@/logic/benchTypeLogic.js';

export default function BenchTypes() {
  return (
    <EntityListPage
      title="Bench Types"
      icon="users"
      subtitle="Manage bench compositions (Single Bench, Division Bench, Full Bench, etc.)."
      logic={benchTypeLogic}
      codeMaxLength={6}
      entityLabel="bench type"
    />
  );
}
