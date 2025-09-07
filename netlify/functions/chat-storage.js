// Netlify Function for Chat Storage using Netlify Blobs
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    // Initialize Blobs store for chat data
    const chatStore = getStore("chat-data");
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || 'anonymous';
    const action = url.searchParams.get('action');

    switch (req.method) {
      case 'GET':
        if (action === 'history') {
          // Get chat history
          const chatHistory = await chatStore.get(`history_${userId}`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: chatHistory ? JSON.parse(chatHistory) : [] 
            }),
            { status: 200, headers }
          );
        } else if (action === 'settings') {
          // Get user settings
          const settings = await chatStore.get(`settings_${userId}`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: settings ? JSON.parse(settings) : {} 
            }),
            { status: 200, headers }
          );
        }
        break;

      case 'POST':
        const body = await req.json();
        
        if (action === 'save-chat') {
          // Save chat message
          const existingHistory = await chatStore.get(`history_${userId}`);
          const history = existingHistory ? JSON.parse(existingHistory) : [];
          
          // Add new chat
          const newChat = {
            id: body.id || Date.now().toString(),
            title: body.title || 'New Chat',
            messages: body.messages || [],
            timestamp: new Date().toISOString(),
            model: body.model
          };
          
          // Keep only last 50 chats
          history.unshift(newChat);
          if (history.length > 50) {
            history.splice(50);
          }
          
          await chatStore.set(`history_${userId}`, JSON.stringify(history));
          
          return new Response(
            JSON.stringify({ success: true, data: newChat }),
            { status: 200, headers }
          );
        } else if (action === 'save-settings') {
          // Save user settings
          await chatStore.set(`settings_${userId}`, JSON.stringify(body));
          
          return new Response(
            JSON.stringify({ success: true, message: 'Settings saved' }),
            { status: 200, headers }
          );
        }
        break;

      case 'DELETE':
        if (action === 'clear-history') {
          // Clear chat history
          await chatStore.delete(`history_${userId}`);
          
          return new Response(
            JSON.stringify({ success: true, message: 'History cleared' }),
            { status: 200, headers }
          );
        } else if (action === 'delete-chat') {
          // Delete specific chat
          const chatId = url.searchParams.get('chatId');
          const existingHistory = await chatStore.get(`history_${userId}`);
          
          if (existingHistory) {
            const history = JSON.parse(existingHistory);
            const filteredHistory = history.filter(chat => chat.id !== chatId);
            await chatStore.set(`history_${userId}`, JSON.stringify(filteredHistory));
          }
          
          return new Response(
            JSON.stringify({ success: true, message: 'Chat deleted' }),
            { status: 200, headers }
          );
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers }
        );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers }
    );

  } catch (error) {
    console.error('Chat storage error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      { status: 500, headers }
    );
  }
};