# Trading System Assistant

An AI-powered trading assistant built with React, FastAPI, and Claude AI.

## Features

- Real-time chat interface with Claude AI
- Trading system analysis and visualization
- Dark/Light mode support
- WebSocket connection with auto-retry
- Conversation management
- Model switching capability

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

Create a `.env` file in the backend directory:
```
ANTHROPIC_API_KEY=your_api_key_here
```

Start the backend server:
```bash
uvicorn app:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## Environment Variables

Backend:
- `ANTHROPIC_API_KEY`: Your Anthropic API key

## Technologies Used

- Frontend:
  - React
  - TypeScript
  - Tailwind CSS
  - Lucide Icons
  - WebSocket

- Backend:
  - FastAPI
  - Python
  - Anthropic Claude AI
  - WebSocket

## Development

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request