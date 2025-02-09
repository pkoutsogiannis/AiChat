# AiChat

A lightweight, self-hosted web interface for various AI chat providers including Anthropic Claude, OpenAI ChatGPT, Google Gemini, Mistral, Cohere, and more. Built with PHP and modern javascript with zero dependencies, it offers a clean, responsive interface with support for multiple AI models, file attachments, and real-time streaming.

Live demo at: https://ai.datasteam.com/aichat

## Features

### Provider Support
- **Anthropic Claude** - Including Claude 3 Opus, Sonnet, and Haiku (latest and versioned models)
- **OpenAI ChatGPT** - Including GPT-4 and variants
- **Google Gemini** - Including Gemini 2.0 Flash and 1.5 Flash
- **DeepSeek**
- **Mistral AI** - Including Mistral Large
- **Cohere** - Including Command-R Plus
- **X.AI Grok** - Including Grok Beta and Grok 2
- **Groq** - Including LLaMA 3.3 70B and Mixtral 8x7B
- **Together AI** - Including Meta LLaMA models and DeepSeek LLM
- **Local Providers**
  - LM Studio
  - Ollama

### Interface Features
- **Real-time Streaming** - Toggle-able streaming responses with SSE support
- **Code Highlighting** - Syntax highlighting via `prism` with copy-to-clipboard functionality
- **Theme Support**
  - Light/Dark mode switching
  - Multiple color themes
- **File Management**                          
  - Upload and attach multiple files to prompts
  - Support for text files and images (provider-dependent)
  - PDF support for compatible providers
  - 15MB file size limit
  - Intelligent MIME type detection
  - Base64 encoding for binary files
- **Chat Features**
  - Message history with session persistence
  - Token usage tracking
  - Conversation reset capability
  - Mobile-responsive design
  
## Requirements

- PHP 7.2 or higher
- Web server (Apache, Nginx, etc.)
- API keys for your chosen providers

## Installation

1. Download or clone this repository to your web server
2. Configure your web server to serve the application directory
3. Optional: Configure your API keys by `lib/config.php` directly.

For usage instructions, please refer to the [User Guide](user-guide.md).

## API Usage

The application provides a REST API that can be accessed using curl or any HTTP client. Here are some examples:

### Basic Text Request
```bash
curl -X POST "https://localhost/aichat/api.php" \
  -H "apikey: PROVIDER-API-KEY" \
  -d "provider=chatgpt" \
  -d "model=gpt-4o" \
  -d "stream=1" \
  -d "reset=0" \
  -d "text=add 1" \
  -b "PHPSESSID=mysession"
```

### File Upload Request
```bash
curl -X POST "https://localhost/aichat/api.php" \
  -H "apikey: PROVIDER-API-KEY" \s
  -H "Content-Type: multipart/form-data" \
  -F "provider=chatgpt" \
  -F "model=gpt-4o" \
  -F "stream=1" \
  -F "reset=0" \
  -F "text=analyze" \
  -F "files[]=@file1.txt" \
  -b "PHPSESSID=mysession"
```

**Parameters:**
- `stream`: Set to 1 to enable streaming responses
- `reset`: Set to 1 to reset conversation history, 0 to maintain it
- `files[]`: Array of files to upload (multipart/form-data only)
- `PHPSESSID`: Cookie used to maintain conversation state.

## General Notes

- API keys entered via UI are stored in browser localStorage
- File uploads are temporary and cleared after each request
- Session data uses PHP native sessions with optional Memcache support
- File upload validation with MIME type checking

## Technical Documentation

For detailed technical documentation including provider implementation, session configuration, and application extension, see [Technical Guide](technical-guide.md).

## Contributing

Contributions are welcome! Please feel free to submit Pull Requests. Areas for contribution include:
- Additional provider integrations
- New themes
- Interface improvements
- Documentation updates
- Bug fixes

## Credits

### Markdown Processing
- **markdown-it** (v13.0.1) - Markdown parser, created by Vitaly Puzrin and Alex Kocharin
- **markdown-it-footnote** (v3.0.3) - Footnote support, by Vitaly Puzrin
- **markdown-it-emoji** (v2.0.2) - Emoji support, by Alex Kocharin
- **markdown-it-task-lists** - Task list support, by Revin Guillen
- **markdown-it-sub** (v1.0.0) - Subscript support, by Vitaly Puzrin
- **markdown-it-sup** (v1.0.0) - Superscript support, by Vitaly Puzrin
- **markdown-it-deflist** (v2.1.0) - Definition list support, by Vitaly Puzrin
- **markdown-it-abbr** (v1.0.4) - Abbreviation support, by Vitaly Puzrin
- **markdown-it-container** (v3.0.0) - Container support, by Vitaly Puzrin
- **markdown-it-ins** (v3.0.1) - Insert/underline support, by Alex Kocharin
- **markdown-it-mark** (v3.0.1) - Mark/highlight support, by Vitaly Puzrin
- **markdown-it-attrs** (v4.3.1) - Attribute support, by Anton Medvedev
- **markdown-it-anchor** (v9.2.0) - Header anchor support, by Valentin Gagarin

### Syntax Highlighting
- **Prism** (v1.29.0) - Syntax highlighting with autoloader plugin, created by Lea Verou and maintained by the Prism team

### Fonts
- **Inter** - Primary UI font, designed by Rasmus Andersson
- **JetBrains Mono** - Monospace font for code blocks, designed by JetBrains

## License

This project is open source software under the Apache 2.0 license.\
Created and maintained by Periklis Koutsogiannis pkoutsogiannis@gmail.com
