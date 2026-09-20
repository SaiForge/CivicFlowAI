# CivicFlowAI - Backend API Gateway

Python FastAPI API Gateway routing requests from the React Frontend to the Autonomous Multi-Agent System (`agent/`).

## Responsibilities
- Receives citizen complaint payloads (text, images, location) from the frontend.
- Proxies requests to `AGENT_SERVICE_URL` (`http://agent:8000` in Docker / `http://localhost:8000` locally).
- Exposes complaint management, ticket retrieval, trace timeline, and manual retry endpoints.

## Running Locally

```bash
cd backend
pip install -r requirements.txt
python -m app.main
```

Server runs on: `http://localhost:5000`  
Docs available at: `http://localhost:5000/docs`
