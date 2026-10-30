import React, { useState } from 'react';
import { X, Sparkles, Send, BookOpen, CheckCircle, ShieldAlert } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

export const AIAssistantModal: React.FC<Props> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Namaste! I am the AICTE Regulatory Knowledge Assistant. I can help you with Security Deposit (FDR) slabs, mandatory joint-holder requirements, lien endorsements, renewal timelines, and APH compliance rules. How may I assist you today?',
    },
  ]);
  const [input, setInput] = useState('');

  const cannedAnswers: Record<string, string> = {
    joint: 'Per AICTE Approval Process Handbook (APH), all Security Deposits must be drawn strictly in the **Joint Name** of "The Regional Officer, AICTE, [Region Name]" and the applicant Institution/Trust. No single-named FDR is acceptable.',
    slab: 'Security Deposit Slabs under APH:\n• Engineering & Technology: ₹35 Lakhs (10 Years)\n• Pharmacy Degree: ₹25 Lakhs (10 Years)\n• Management (MBA/PGDM): ₹15 Lakhs (10 Years)\n• MCA: ₹15 Lakhs (10 Years)\n• Diploma Programs: ₹15-20 Lakhs (8-10 Years)',
    lien: 'An explicit **Lien Endorsement** in favor of AICTE must be marked by the issuing Nationalized or Scheduled Commercial Bank in their Core Banking System (CBS) before final approval is granted.',
    renewal: 'FDRs must have an **Auto-Renewal clause** or be renewed at least 60 days before maturity. AICTE issues 90-day, 60-day, and 30-day alerts. If not renewed, show-cause proceedings may be triggered under regulatory provisions.',
    release: 'Security Deposits are eligible for release only after completion of the prescribed term (e.g. 10 years) with zero student grievances or upon formal closure of the institution approved by the AICTE Executive Council.',
  };

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = { role: 'user', text: query };
    const qLower = query.toLowerCase();

    let botResponse = 'According to AICTE Approval Process Handbook (APH) regulations, all Security Deposits and Fixed Deposits must comply with statutory tenure, joint-holder title with the Regional Officer, and lien marking on the banking system.';

    if (qLower.includes('joint') || qLower.includes('title') || qLower.includes('name')) {
      botResponse = cannedAnswers.joint;
    } else if (qLower.includes('slab') || qLower.includes('amount') || qLower.includes('how much') || qLower.includes('fees')) {
      botResponse = cannedAnswers.slab;
    } else if (qLower.includes('lien') || qLower.includes('bank') || qLower.includes('cbs')) {
      botResponse = cannedAnswers.lien;
    } else if (qLower.includes('renew') || qLower.includes('maturity') || qLower.includes('expire')) {
      botResponse = cannedAnswers.renewal;
    } else if (qLower.includes('release') || qLower.includes('refund') || qLower.includes('withdraw')) {
      botResponse = cannedAnswers.release;
    }

    setMessages((prev) => [...prev, userMsg, { role: 'assistant', text: botResponse }]);
    setInput('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px', height: '580px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header" style={{ background: '#ffffff', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>AICTE Regulatory Knowledge Assistant</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Grounded in Approval Process Handbook (APH) Rules</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick topic buttons */}
        <div style={{ padding: '0.625rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.375rem', overflowX: 'auto' }}>
          <button
            onClick={() => handleSend('What are the Security Deposit slabs?')}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap' }}
          >
            Deposit Slabs
          </button>
          <button
            onClick={() => handleSend('What is the joint name requirement?')}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap' }}
          >
            Joint Account Title
          </button>
          <button
            onClick={() => handleSend('How does bank lien marking work?')}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap' }}
          >
            Bank Lien Marking
          </button>
          <button
            onClick={() => handleSend('What are the rules for renewal upon maturity?')}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap' }}
          >
            Renewal & Maturity
          </button>
        </div>

        {/* Chat message area */}
        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-line',
                backgroundColor: m.role === 'user' ? '#1e40af' : '#f1f5f9',
                color: m.role === 'user' ? '#ffffff' : '#0f172a',
                borderBottomRightRadius: m.role === 'user' ? '2px' : '12px',
                borderBottomLeftRadius: m.role === 'assistant' ? '2px' : '12px',
              }}
            >
              {m.text}
            </div>
          ))}
        </div>

        {/* Input box */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="form-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about AICTE FDR rules..."
            style={{ flex: 1 }}
          />
          <button onClick={() => handleSend()} className="btn btn-primary" style={{ padding: '0.625rem 1rem' }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
