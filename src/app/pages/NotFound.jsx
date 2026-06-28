import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';

export default function NotFound() {
  const { settings } = useSettings();
  const nav = useNavigate();
  return (
    <div className="empty notfound__padding-top">
      <div className="empty__icon notfound__big-icon"><Icon name="alert" size={32} /></div>
      <h1 className="notfound__title">404</h1>
      <p className="mb-20">This page does not exist in {settings.siteTitle}.</p>
      <Button icon="grid" onClick={() => nav('/')}>Back to Dashboard</Button>
    </div>
  );
}
