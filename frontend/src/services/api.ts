const API_BASE_URL = 'http://localhost:8000/api';

export const chatService = {
  sendMessage: async (message: string) => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return response.json();
  },
};