# User Guide

## Overview
AiChat is a versatile chat interface that allows you to interact with various AI models. This documentation will guide you through all the features and functionality available in the interface.

## Interface Elements

### Top Bar

#### Provider and Model Selection
- **Provider Select**: Choose your AI provider from the dropdown menu on the left
- **Model Select**: Select the specific model you want to use from the available options for the chosen provider

#### Theme and Settings
Located on the right side of the top bar:
- **Theme Select**: Choose from various color themes like marine-pro, slate-frost, etc.
- **Dark/Light Mode Toggle**: Switch between dark and light interface modes
- **API Key Button**: Set up your API key for the selected provider
- **Download Button**: Download your chat history
- **Reset Button**: Clear the current conversation

### Chat Area

#### Message Display
- Messages are displayed in a scrollable area
- User messages appear with a different style than AI responses
- Code blocks include a copy button for easy copying

#### Navigation
- **Top Arrow**: Scroll to the beginning of the conversation
- **Previous Message**: Jump to the previous AI response
- **Next Message**: Jump to the next AI response
- **Bottom Arrow**: Scroll to the end of the conversation

### Input Area

#### Message Input
- **Text Area**: Type your message here
- The input area automatically expands as you type
- Press Enter to send (Shift+Enter for new line)

#### File Attachments
1. **Upload Button**: Click the paperclip icon or drag files to attach
2. **File Preview**: Shows thumbnails of attached files
3. Click on previewed files to remove them

#### Control Panel
- **Session Info**: Shows token usage information
- **Send Button**: Send your message (or press Enter)
- **Abort Button**: Cancel the current response (appears during AI response)

## Features

### Conversation Management
- **History**: Conversations are saved automatically
- **Reset**: Use the reset button to start a new conversation
- **Download**: Save your conversation history locally

### Code Handling
- Syntax highlighting for code blocks
- Copy button for easy code copying
- Supports multiple programming languages

### File Support
- Upload multiple files simultaneously
- Preview attached files before sending
- Remove individual files from the upload queue

### Theme Customization
- Multiple pre-designed themes available
- Dark/light mode toggle
- Consistent styling across all elements

## Tips

### Best Practices
1. **API Keys**: Keep your API keys secure and never share them
2. **File Uploads**: Check file previews before sending to ensure correct selection
3. **Long Messages**: Use Shift+Enter for multi-line input
4. **Navigation**: Use scroll buttons for quick navigation in long conversations
5. **Code**: Use the copy button to avoid manual selection of code blocks

### Mobile Usage
- The interface is fully responsive for mobile devices
- Touch-friendly buttons and controls

### Troubleshooting
1. If responses stop:
   - Type `continue` to resume
   - Check your internet connection
   - Verify API key is correct
   - Try resetting the conversation

2. If file upload fails:
   - Check file size limits
   - Ensure file type is supported
   - Try uploading files individually

3. If streaming isn't working:
   - Check if streaming is toggled on
   - Type `continue` to resume
   - Verify browser compatibility
   - Check internet stability

## Keyboard Shortcuts
- **Enter**: Send message
- **Shift+Enter**: New line in message
- **Esc**: Cancel current response (when available)

## Obtaining API Keys

To use AiChat, you'll need an API key from your chosen provider. Here's where to get them:

1. **Anthropic (Claude)**
   [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

2. **OpenAI (ChatGPT)**
   [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

3. **DeepSeek**
   [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)

4. **Google (Gemini)**
   [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

5. **Mistral**
   [https://console.mistral.ai/api-keys/](https://console.mistral.ai/api-keys/)

6. **Cohere**
   [https://dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys)

7. **XAI (Grok)**
   [https://grok.x.ai/](https://grok.x.ai/)

8. **Groq**
   [https://console.groq.com/keys](https://console.groq.com/keys)

9. **Together**
   [https://api.together.xyz/settings/api-keys](https://api.together.xyz/settings/api-keys)

### Important Notes About API Keys
- Keep your API keys secure and never share them
- Most providers offer both free and paid tiers
- Some providers may require payment information even for free tiers
- API keys can be regenerated if compromised
- Usage limits and pricing vary by provider

## Security Notes
- API keys are stored locally in your browser
- No data is permanently stored on servers