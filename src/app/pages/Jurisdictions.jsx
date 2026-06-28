import EntityListPage from '@/components/EntityListPage.jsx';
import { jurisdictionLogic } from '@/logic/jurisdictionLogic.js';

export default function Jurisdictions() {
  return (
    <EntityListPage
      title="Jurisdictions"
      icon="grid"
      subtitle="Manage court jurisdictions (Civil, Criminal, Family, etc.)."
      logic={jurisdictionLogic}
      codeMaxLength={8}
      entityLabel="jurisdiction"
    />
  );
}
