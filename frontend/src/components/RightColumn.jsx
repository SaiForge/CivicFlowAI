import React from 'react';

const tasks = [
  {
    id: 1,
    name: 'Interview',
    time: 'Sep 13, 08:30',
    done: true,
    icon: (
      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 2,
    name: 'Team Meeting',
    time: 'Sep 13, 10:30',
    done: true,
    icon: (
      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 3,
    name: 'Project Update',
    time: 'Sep 13, 13:00',
    done: false,
    icon: (
      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 4,
    name: 'Discuss Q3 Goals',
    time: 'Sep 13, 14:45',
    done: false,
    icon: (
      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 5,
    name: 'HR Policy Review',
    time: 'Sep 13, 16:30',
    done: false,
    icon: (
      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    ),
  },
];

const RightColumn = () => {
  return (
    <div className="col-right">
      {/* Onboarding Summary Card */}
      <div className="card onboarding-card">
        <div className="onboarding-header">
          <h4 className="onboarding-title">Onboarding</h4>
          <span className="onboarding-pct">18%</span>
        </div>
        <div className="segment-labels">
          <span>30%</span>
          <span>25%</span>
          <span>0%</span>
        </div>
        <div className="segment-bar">
          <div className="seg seg-yellow" style={{ width: '45%' }} />
          <div className="seg seg-dark" style={{ width: '35%' }} />
          <div className="seg seg-empty" style={{ width: '20%' }} />
        </div>
        <div>
          <span className="tag-task">Task</span>
        </div>
      </div>

      {/* Onboarding Tasks List Card */}
      <div className="tasks-card">
        <div className="tasks-header">
          <h4 className="tasks-title">Onboarding Task</h4>
          <span className="tasks-count">2/8</span>
        </div>

        <div className="tasks-list">
          {tasks.map((task) => (
            <div key={task.id} className="task-row">
              <div className="task-left">
                <div className="task-icon-wrap">{task.icon}</div>
                <div>
                  <div className="task-name">{task.name}</div>
                  <div className="task-time">{task.time}</div>
                </div>
              </div>
              {task.done ? (
                <div className="task-done">✓</div>
              ) : (
                <div className="task-pending" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightColumn;
