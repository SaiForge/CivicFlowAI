import React from 'react';

// STATUS → color mapping using existing design tokens
const statusConfig = {
  'Submitted':            { cls: 'status-submitted',   label: 'Submitted' },
  'Under Review':         { cls: 'status-review',      label: 'Under Review' },
  'Assigned':             { cls: 'status-assigned',    label: 'Assigned' },
  'In Progress':          { cls: 'status-progress',    label: 'In Progress' },
  'Resolution Submitted': { cls: 'status-resolution',  label: 'Resolution Submitted' },
  'Verification Pending': { cls: 'status-verify',      label: 'Verification Pending' },
  'Resolved':             { cls: 'status-resolved',    label: 'Resolved' },
  'Closed':               { cls: 'status-closed',      label: 'Closed' },
  'Escalated':            { cls: 'status-escalated',   label: 'Escalated' },
};

const priorityConfig = {
  'Critical': { cls: 'priority-critical', label: 'Critical' },
  'High':     { cls: 'priority-high',     label: 'High' },
  'Medium':   { cls: 'priority-medium',   label: 'Medium' },
  'Low':      { cls: 'priority-low',      label: 'Low' },
};

export const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { cls: 'status-submitted', label: status };
  return <span className={`civic-badge ${cfg.cls}`}>{cfg.label}</span>;
};

export const PriorityBadge = ({ priority }) => {
  const cfg = priorityConfig[priority] || { cls: 'priority-medium', label: priority };
  return <span className={`civic-badge ${cfg.cls}`}>{cfg.label}</span>;
};

export default StatusBadge;
