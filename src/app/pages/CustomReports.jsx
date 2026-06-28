import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Field, { Input, Textarea, Select } from '@/components/Field.jsx';

import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { reportLogic } from '@/logic/reportLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

export default function CustomReports() {
  const [reports, setReports] = useState([]);
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('cases');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  const load = () => {
    reportLogic.list().then(setReports).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async () => {
    if (!reportName.trim()) {
      toast.push('Report name is required.', 'error');
      return;
    }
    setGenerating(true);
    const r = await reportLogic.generate({ name: reportName, reportType, description });
    if (r && r.ok) {
      toast.push('Report generated!', 'success');
      setReportName('');
      setDescription('');
      load();
    } else {
      toast.push(r?.error || 'Failed to generate report.', 'error');
    }
    setGenerating(false);
  };

  return (
    <div>
      <PageHeader icon="file" title="Custom Reports" subtitle="Build and generate custom reports." />
      <div className="grid-2">
        <Card title="Report Builder">
          <Field label="Report Name">
            <Input value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="Enter report name" />
          </Field>
          <Field label="Report Type">
            <Select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="cases">Case Report</option>
              <option value="courts">Court Report</option>
              <option value="user-activity">User Activity</option>
              <option value="ai-usage">AI Usage</option>
            </Select>
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </Field>
          <div className="form-actions">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </Card>
        <Card title="Saved Reports">
          {reports.length === 0 ? (
            <div className="empty-state">
              <Icon name="file" size={24} />
              <p>No saved reports yet.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Generated</th>
                </tr>
              </thead>
              <tbody>
                {[...reports]
                  .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
                  .map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>
                        <span className="badge badge--info">{r.report_type}</span>
                      </td>
                      <td>{r.last_generated || r.created_at || r.createdAt || ''}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
