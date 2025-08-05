// OpenRouter API Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Application State
let state = {
    apiKey: localStorage.getItem('openrouter_api_key') || '',
    currentModel: localStorage.getItem('selected_model') || 'openai/gpt-3.5-turbo',
    chatHistory: JSON.parse(localStorage.getItem('chat_history')) || [],
    currentChatId: null,
    messages: [],
    totalTokens: 0,
    settings: {
        maxTokens: parseInt(localStorage.getItem('max_tokens')) || 2000,
        temperature: parseFloat(localStorage.getItem('temperature')) || 0.7,
        showTimestamps: localStorage.getItem('show_timestamps') !== 'false',
        soundEnabled: localStorage.getItem('sound_enabled') === 'true'
    },
    availableModels: []
};

// DOM Elements
const elements = {
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    messagesContainer: document.getElementById('messagesContainer'),
    modelSelector: document.getElementById('modelSelector'),
    modelSearch: document.getElementById('modelSearch'),
    tokenCount: document.getElementById('tokenCount'),
    sidebar: document.getElementById('sidebar'),
    menuToggle: document.getElementById('menuToggle'),
    themeToggle: document.getElementById('themeToggle'),
    newChatBtn: document.getElementById('newChatBtn'),
    historyList: document.getElementById('historyList'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettings: document.getElementById('closeSettings'),
    apiKey: document.getElementById('apiKey'),
    toggleApiKey: document.getElementById('toggleApiKey'),
    maxTokens: document.getElementById('maxTokens'),
    temperature: document.getElementById('temperature'),
    tempValue: document.getElementById('tempValue'),
    showTimestamps: document.getElementById('showTimestamps'),
    soundEnabled: document.getElementById('soundEnabled'),
    saveSettings: document.getElementById('saveSettings'),
    exportBtn: document.getElementById('exportBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

// Initialize Application
async function init() {
    loadTheme();
    loadSettings();
    loadChatHistory();
    setupEventListeners();
    
    if (state.apiKey) {
        await loadAvailableModels();
    } else {
        showSettingsModal();
        showNotification('Please enter your OpenRouter API key to get started', 'warning');
    }
    
    // Auto-resize textarea
    elements.messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Send message
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Mobile menu toggle
    elements.menuToggle.addEventListener('click', () => {
        elements.sidebar.classList.toggle('active');
    });
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // New chat
    elements.newChatBtn.addEventListener('click', startNewChat);
    
    // Settings
    elements.settingsBtn.addEventListener('click', showSettingsModal);
    elements.closeSettings.addEventListener('click', hideSettingsModal);
    elements.saveSettings.addEventListener('click', saveSettings);
    
    // API key visibility toggle
    elements.toggleApiKey.addEventListener('click', () => {
        const input = elements.apiKey;
        const icon = elements.toggleApiKey.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    });
    
    // Temperature slider
    elements.temperature.addEventListener('input', (e) => {
        elements.tempValue.textContent = e.target.value;
    });
    
    // Export chat
    elements.exportBtn.addEventListener('click', exportChat);
    
    // Clear all chats
    elements.clearAllBtn.addEventListener('click', clearAllChats);
    
    // Model search
    elements.modelSearch.addEventListener('input', filterModels);
    
    // Model selector
    elements.modelSelector.addEventListener('change', (e) => {
        state.currentModel = e.target.value;
        localStorage.setItem('selected_model', state.currentModel);
    });
    
    // Close modal on background click
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            hideSettingsModal();
        }
    });
}

// Load available models from OpenRouter
async function loadAvailableModels() {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${state.apiKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': '0xHiTek Chat'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            state.availableModels = data.data || [];
            populateModelSelector();
        } else {
            // Fallback to common models if API fails
            state.availableModels = [
                { id: 'openai/gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
                { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
                { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
                { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
                { id: 'google/gemini-pro', name: 'Gemini Pro' },
                { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B' }
            ];
            populateModelSelector();
        }
    } catch (error) {
        console.error('Error loading models:', error);
        // Use fallback models
        state.availableModels = [
            { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
        ];
        populateModelSelector();
    }
}

// Populate model selector dropdown
function populateModelSelector() {
    elements.modelSelector.innerHTML = '';
    
    state.availableModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name || model.id;
        if (model.id === state.currentModel) {
            option.selected = true;
        }
        elements.modelSelector.appendChild(option);
    });
}

// Filter models based on search
function filterModels() {
    const searchTerm = elements.modelSearch.value.toLowerCase();
    const options = elements.modelSelector.options;
    
    for (let option of options) {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(searchTerm) ? '' : 'none';
    }
}

// Send message to OpenRouter
async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || !state.apiKey) return;
    
    // Disable input while processing
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    elements.sendBtn.disabled = true;
    showLoading(true);
    
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Prepare messages for API
    const messages = [...state.messages, { role: 'user', content: message }];
    
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.apiKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': '0xHiTek Chat',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: state.currentModel,
                messages: messages,
                max_tokens: state.settings.maxTokens,
                temperature: state.settings.temperature
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;
        
        // Update token count
        if (data.usage) {
            state.totalTokens += data.usage.total_tokens;
            elements.tokenCount.textContent = state.totalTokens;
        }
        
        // Add assistant message to chat
        addMessageToChat('assistant', assistantMessage);
        
        // Update state messages
        state.messages.push(
            { role: 'user', content: message },
            { role: 'assistant', content: assistantMessage }
        );
        
        // Save to history
        updateChatHistory();
        
        // Play sound if enabled
        if (state.settings.soundEnabled) {
            playNotificationSound();
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        elements.sendBtn.disabled = false;
        showLoading(false);
        elements.messageInput.focus();
    }
}

// Add message to chat UI
function addMessageToChat(role, content) {
    // Remove welcome message if exists
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const timestamp = state.settings.showTimestamps 
        ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-${role === 'user' ? 'user' : 'robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-role">${role === 'user' ? 'You' : 'AI'}</span>
                ${timestamp ? `<span class="message-time">${timestamp}</span>` : ''}
            </div>
            <div class="message-text">${escapeHtml(content)}</div>
        </div>
    `;
    
    elements.messagesContainer.appendChild(messageDiv);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// Start new chat
function startNewChat() {
    state.messages = [];
    state.currentChatId = Date.now().toString();
    state.totalTokens = 0;
    elements.tokenCount.textContent = '0';
    
    // Clear messages container and show welcome
    elements.messagesContainer.innerHTML = `
        <div class="welcome-message">
            <div class="cyber-grid"></div>
            <h2 class="glitch" data-text="Welcome to 0xHiTek">Welcome to 0xHiTek</h2>
            <p>Your gateway to AI models via OpenRouter</p>
            <div class="feature-grid">
                <div class="feature-card">
                    <i class="fas fa-robot"></i>
                    <span>Multiple AI Models</span>
                </div>
                <div class="feature-card">
                    <i class="fas fa-shield-alt"></i>
                    <span>Secure & Private</span>
                </div>
                <div class="feature-card">
                    <i class="fas fa-bolt"></i>
                    <span>Fast Response</span>
                </div>
            </div>
        </div>
    `;
    
    updateChatHistory();
}

// Update chat history
function updateChatHistory() {
    if (!state.currentChatId) {
        state.currentChatId = Date.now().toString();
    }
    
    const chatIndex = state.chatHistory.findIndex(chat => chat.id === state.currentChatId);
    const chatData = {
        id: state.currentChatId,
        title: state.messages[0]?.content?.substring(0, 30) || 'New Chat',
        messages: state.messages,
        timestamp: new Date().toISOString(),
        model: state.currentModel
    };
    
    if (chatIndex >= 0) {
        state.chatHistory[chatIndex] = chatData;
    } else if (state.messages.length > 0) {
        state.chatHistory.unshift(chatData);
    }
    
    // Keep only last 50 chats
    if (state.chatHistory.length > 50) {
        state.chatHistory = state.chatHistory.slice(0, 50);
    }
    
    localStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
    renderChatHistory();
}

// Render chat history in sidebar
function renderChatHistory() {
    elements.historyList.innerHTML = '';
    
    state.chatHistory.forEach(chat => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${chat.id === state.currentChatId ? 'active' : ''}`;
        historyItem.innerHTML = `
            <div>${escapeHtml(chat.title)}...</div>
            <small>${new Date(chat.timestamp).toLocaleDateString()}</small>
        `;
        historyItem.addEventListener('click', () => loadChat(chat.id));
        elements.historyList.appendChild(historyItem);
    });
}

// Load chat from history
function loadChat(chatId) {
    const chat = state.chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    
    state.currentChatId = chatId;
    state.messages = chat.messages;
    state.currentModel = chat.model;
    elements.modelSelector.value = chat.model;
    
    // Rebuild chat UI
    elements.messagesContainer.innerHTML = '';
    state.messages.forEach(msg => {
        addMessageToChat(msg.role, msg.content);
    });
    
    renderChatHistory();
}

// Load chat history from localStorage
function loadChatHistory() {
    renderChatHistory();
}

// Export chat
function exportChat() {
    if (state.messages.length === 0) {
        showNotification('No messages to export', 'warning');
        return;
    }
    
    const chatData = {
        title: `0xHiTek Chat - ${new Date().toLocaleString()}`,
        model: state.currentModel,
        messages: state.messages,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `0xhitek-chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Chat exported successfully', 'success');
}

// Clear all chats
function clearAllChats() {
    if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
        state.chatHistory = [];
        state.messages = [];
        state.currentChatId = null;
        state.totalTokens = 0;
        elements.tokenCount.textContent = '0';
        
        localStorage.removeItem('chat_history');
        renderChatHistory();
        startNewChat();
        
        showNotification('All chats cleared', 'success');
    }
}

// Settings functions
function showSettingsModal() {
    elements.settingsModal.classList.add('active');
    elements.apiKey.value = state.apiKey;
    elements.maxTokens.value = state.settings.maxTokens;
    elements.temperature.value = state.settings.temperature;
    elements.tempValue.textContent = state.settings.temperature;
    elements.showTimestamps.checked = state.settings.showTimestamps;
    elements.soundEnabled.checked = state.settings.soundEnabled;
}

function hideSettingsModal() {
    elements.settingsModal.classList.remove('active');
}

async function saveSettings() {
    const apiKey = elements.apiKey.value.trim();
    
    if (!apiKey) {
        showNotification('API key is required', 'error');
        return;
    }
    
    state.apiKey = apiKey;
    state.settings.maxTokens = parseInt(elements.maxTokens.value);
    state.settings.temperature = parseFloat(elements.temperature.value);
    state.settings.showTimestamps = elements.showTimestamps.checked;
    state.settings.soundEnabled = elements.soundEnabled.checked;
    
    // Save to localStorage
    localStorage.setItem('openrouter_api_key', state.apiKey);
    localStorage.setItem('max_tokens', state.settings.maxTokens);
    localStorage.setItem('temperature', state.settings.temperature);
    localStorage.setItem('show_timestamps', state.settings.showTimestamps);
    localStorage.setItem('sound_enabled', state.settings.soundEnabled);
    
    hideSettingsModal();
    showNotification('Settings saved successfully', 'success');
    
    // Reload models with new API key
    await loadAvailableModels();
}

function loadSettings() {
    if (state.apiKey) {
        elements.apiKey.value = state.apiKey;
    }
    elements.maxTokens.value = state.settings.maxTokens;
    elements.temperature.value = state.settings.temperature;
    elements.tempValue.textContent = state.settings.temperature;
    elements.showTimestamps.checked = state.settings.showTimestamps;
    elements.soundEnabled.checked = state.settings.soundEnabled;
}

// Theme functions
function toggleTheme() {
    const body = document.body;
    const isDark = !body.classList.contains('light-theme');
    
    if (isDark) {
        body.classList.add('light-theme');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('light-theme');
        elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'dark');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.add('active');
    } else {
        elements.loadingOverlay.classList.remove('active');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? 'var(--red)' : type === 'success' ? 'var(--green)' : 'var(--yellow)'};
        color: var(--bg-primary);
        border-radius: 8px;
        font-weight: bold;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function playNotificationSound() {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
