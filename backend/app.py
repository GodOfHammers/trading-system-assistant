from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import anthropic
import os
import json
from typing import List, Dict
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not found in environment variables")

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

class MessageRequest(BaseModel):
    message: str
    model: str = "claude-3-sonnet-20240229"
    conversation_id: str

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            request_data = json.loads(data)
            
            message = request_data.get("message")
            model = request_data.get("model", "claude-3-sonnet-20240229")
            
            try:
                # Create system message specific to trading system
                system_message = """You are a Trading System Assistant with expertise in financial markets, 
                trading strategies, and market analysis. You have access to a sophisticated trading system 
                that includes features for technical analysis, portfolio optimization, risk management, 
                and automated trading. Provide detailed, accurate responses about trading and financial topics."""

                # Make API call to Claude
                response = client.messages.create(
                    model=model,
                    max_tokens=2000,
                    messages=[
                        {
                            "role": "system",
                            "content": system_message
                        },
                        {
                            "role": "user",
                            "content": message
                        }
                    ],
                    temperature=0.7
                )

                # Send response back through WebSocket
                await websocket.send_text(json.dumps({
                    "response": response.content[0].text,
                    "metadata": {
                        "model": model,
                        "tokens": response.usage.output_tokens,
                        "finish_reason": getattr(response, 'stop_reason', None),
                    }
                }))
                
            except Exception as e:
                print(f"Error processing message: {str(e)}")
                await websocket.send_text(json.dumps({
                    "error": f"Error processing message: {str(e)}"
                }))
                
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        if not websocket.client_state.DISCONNECTED:
            await websocket.close()

@app.get("/health")
async def health_check():
    try:
        # Test the API key by making a simple request
        client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=10,
            messages=[{"role": "user", "content": "test"}]
        )
        return {
            "status": "healthy",
            "api_key_configured": True,
            "api_key_valid": True
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "api_key_configured": bool(ANTHROPIC_API_KEY),
            "api_key_valid": False,
            "error": str(e)
        }