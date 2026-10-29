import { Link } from 'react-router-dom';
import {
  ArrowRight, Boxes, FileSpreadsheet, Files, LineChart, Shield, Users,
} from 'lucide-react';

const GROUPS = [
  { title: 'Billing & documents', icon: Files, color: '#008b9b', items: ['Tax Invoice, Proforma, Credit Note, Bill of Supply', 'CGST / SGST / IGST with HSN & SAC', 'PDF download, print layouts, UPI QR'] },
  { title: 'Books & operations', icon: Boxes, color: '#22c55e', items: ['Clients, products, inventory alerts', 'Purchases, expenses, receipts', 'Recurring invoices & reports'] },
  { title: 'GST compliance', icon: FileSpreadsheet, color: '#a855f7', items: ['GSTR-1 & GSTR-3B summaries', 'GSTR-2B reconciliation helpers', 'JSON export for portal upload'] },
  { title: 'Security & tenancy', icon: Shield, color: '#eab308', items: ['Organisation-level DB isolation', 'JWT sessions + bcrypt passwords', 'Lock when trial/subscription ends'] },
  { title: 'Customers & cashflow', icon: Users, color: '#ec4899', items: ['Client statements & ageing', 'Partial payments & credit', 'Party outstanding tracking'] },
  { title: 'Growth tooling', icon: LineChart, color: '#008b9b', items: ['Dashboard KPIs & overdue alerts', 'Recurring retainers', 'Tenant backup snapshots'] },
];

export default function FeaturesPage() {
  return (
    <div className="g-page">
      <div className="g-page-head">
        <p className="g-eyebrow">Product capabilities</p>
        <h1>Everything for <span>GST billing</span></h1>
        <p>Same card grid structure as our homepage services — deeper detail for every module.</p>
      </div>

      <div className="g-svc-grid">
        {GROUPS.map(({ title, icon: Icon, color, items }) => (
          <article key={title} className="g-svc-card">
            <div className="g-svc-ico" style={{ background: color }}>
              <Icon size={22} />
            </div>
            <h3>{title}</h3>
            {items.map((item) => (
              <p key={item} style={{ marginBottom: 6 }}>• {item}</p>
            ))}
            <span className="g-svc-arrow"><ArrowRight size={14} /></span>
          </article>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 36 }}>
        <Link to="/register" className="g-btn g-btn-primary">
          Start 7-day free trial <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
