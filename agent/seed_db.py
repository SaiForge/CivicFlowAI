import json
from pathlib import Path
from app.memory.long_term import LongTermMemory

def seed():
    memory = LongTermMemory()
    seed_path = Path('data/civic_complaints_seed.json')
    if not seed_path.exists():
        print("Seed file not found.")
        return

    with open(seed_path, 'r', encoding='utf-8') as f:
        seeds = json.load(f)

    for s in seeds[:8]:
        ticket_id = s.get('id', 'SEED-001')
        loc = s.get('location', {})
        exp = s.get('expected', {})
        issue = exp.get('issue_type', 'pothole')
        dept = exp.get('primary_department', 'Roads & Infrastructure Department')
        sev = exp.get('severity', 'High')
        sev_score = 88 if sev == 'Critical' else 72

        ticket = {
            'ticket_id': ticket_id,
            'issue_type': issue,
            'description': s.get('complaint_text', ''),
            'severity': sev,
            'department': dept,
            'location': loc,
            'status': 'Submitted',
            'created_at': '2026-09-20T10:00:00',
            'updated_at': '2026-09-20T10:00:00',
            'verification': {'approved': True, 'failed_agents': [], 'feedback': {}},
            'retry_count': 0,
            'severity_score': sev_score,
            'grounding_score': 0.92 if s.get('multimodal', {}).get('has_image') else 0.75,
            'issue_confidence': 0.94,
            'routing_confidence': 0.95
        }
        memory.save_ticket(ticket)
        memory.log_action(ticket_id, 'IssueAgent', 0, {'issue_type': issue, 'confidence': 0.94}, f'Identified {issue}', True, 'Initial analysis')
        memory.log_action(ticket_id, 'SeverityAgent', 0, {'severity': sev, 'score': sev_score}, f'Rubric score {sev_score}', True, '4-Factor rubric')
        memory.log_action(ticket_id, 'RoutingAgent', 0, {'department': dept}, f'Routed to {dept}', True, 'Department lookup')
        memory.log_action(ticket_id, 'VerificationAgent', 0, {'approved': True}, 'Quality gate passed with 0 violations', True, 'Stage 3 quality gate')

    print(f"Successfully seeded {len(seeds[:8])} tickets into LongTermMemory.")

if __name__ == '__main__':
    seed()
