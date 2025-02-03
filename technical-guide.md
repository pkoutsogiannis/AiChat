# Technical Guide

## Provider Implementation

This guide explains when and how to override base methods when creating a new Provider descendant class.

### Core Methods to Consider Overriding

#### 1. `getHeaders()`
**When to override:**
- When your API requires custom authentication headers
- When you need to add specific headers required by the provider's API

**Example:**
```php
public function getHeaders() {
    return [
        "x-api-key: " . $this->apikey()
    ];
}
```

#### 2. `prepareMessage($role, $prompt)`
**When to override:**
- When your provider has a unique message format (e.g., different role names or structure)
- When you need special handling for file uploads (images, PDFs, etc.)
- When you need to support specific file types or formats
- When the provider requires a specific way to combine uploads with the prompt

**Base Implementation:**
The base Provider class implements a standard message format:
```php
public function prepareMessage($role, $prompt) {
    $result = "";
    if ($role == "user") foreach ($this->uploads() as $upload) {
        if ($this->isTextContent($upload)) {
            $result .= $this->prepareTextUpload($upload);
        } else {
            throw new ProviderUploadException($upload);
        }
    }
    return ["role" => $role, "content" => $result . ($result ? "\n\n" : "") . $prompt];
}
```

**Example from AnthropicProvider (Vision Support):**
```php
public function prepareMessage($role, $prompt) {
    $result = [];
    if ($role == "user") foreach ($this->uploads() as $upload) {
        if ($this->isTextContent($upload)) {
            $result[] = [
                "type" => "text",
                "text" => $this->prepareTextUpload($upload)
            ];
        } else if (in_array(strtolower($upload["mime"]), 
            ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'], true)) {
            // First add filename
            $result[] = [
                "type" => "text",
                "text" => $upload["name"],
            ];
            // Then add file content
            $result[] = [
                "type" => strpos($upload["mime"], 'image/') === 0 ? "image" : "document",
                "source" => [
                    "type" => "base64",
                    "media_type" => $upload["mime"],
                    "data" => base64_encode($upload["content"])
                ]
            ];
        } else {
            throw new ProviderUploadException($upload);
        }
    }
    return [
        "role" => $role,
        "content" => array_merge($result, [[
            "type" => "text",
            "text" => $prompt,
        ]])
    ];
}
```

**Example from OllamaProvider (Combined Text/Image Support):**
```php
public function prepareMessage($role, $prompt) {
    $result = [];
    
    $text_files = ""; 
    $binary_files = [];
    if ($role == "user") foreach ($this->uploads() as $upload) {
        if ($this->isTextContent($upload)) {
            $text_files .= $this->prepareTextUpload($upload); 
        } else if (in_array(strtolower($upload["mime"]), 
            ['image/jpeg','image/png','image/gif','image/webp'], true)) {
            $binary_files["names"][] = $upload["name"];
            $binary_files["contents"][] = base64_encode($upload["content"]);
        } else {
            throw new ProviderUploadException($upload);
        }
    }
    
    $result = [
        "role" => $role, 
        "content" => ($text_files ? $text_files."\n" : "") .
                    (!empty($binary_files) ? "file names: ".implode(",", $binary_files["names"])."\n\n" : "") .
                    $prompt, 
    ];
    
    if ($binary_files["contents"]) 
        $result["images"] = $binary_files["contents"];
        
    return $result;
}
```

**Key Considerations:**
1. **Role Mapping**: Some providers use different role names (e.g., "model" instead of "assistant")
2. **File Handling**:
   - Text files: Usually concatenated with the prompt
   - Images: Often need base64 encoding and specific format
   - PDFs: May need special processing or conversion
3. **Content Structure**:
   - Some providers expect a simple string
   - Others require structured content with type information
   - Some support mixed content types (text + images)
4. **Error Handling**:
   - Always use ProviderUploadException for unsupported files
   - Validate MIME types before processing

#### 3. `prepareRequest($text, $messages)`
**When to override:**
- When your provider requires a different request structure
- When you need to add provider-specific parameters
- When you need to format the conversation history differently
- When you need to handle streaming options differently

**Base Implementation:**
The base Provider class implements a standard request format:
```php
public function prepareRequest($text, $messages) {
    return [
        "model" => $this->model,
        "messages" => $messages,
        "max_tokens" => 4096,
        "stream" => $this->stream
    ];
}
```

**Example from OpenAIProvider (with streaming options):**
```php
public function prepareRequest($text, $messages) {
    return array_merge(
        [
            "model" => $this->model,
            "messages" => $messages,
            "stream" => $this->stream
        ],
        $this->stream ? [
            "stream_options" => [
                "include_usage" => true,
            ]
        ] : []
    );
}
```

**Example from CohereProvider (with context handling):**
```php
public function prepareRequest($text, $messages) {
    // Get the latest message (prompt)
    $lastMessage = end($messages);
    $prompt = $lastMessage["content"];

    // Format previous messages as context
    $context = "";
    if (count($messages) > 1) {
        array_pop($messages); // Remove the last message as it's our prompt
        foreach ($messages as $message) {
            $role = $message["role"] === "assistant" ? "Assistant" : "Human";
            $context .= $role . ": " . $message["content"] . "\n";
        }
    }

    return [
        "model" => $this->model,
        "prompt" => $prompt,
        "context" => $context,
        "stream" => $this->stream
    ];
}
```

**Key Considerations:**
1. **Request Structure**:
   - Basic fields: model, messages, stream
   - Provider-specific fields: temperature, max_tokens, etc.
   - Streaming options: chunk size, usage tracking, etc.

2. **Message History**:
   - Some providers use standard message arrays
   - Others need formatted context strings
   - May need to handle system messages differently

3. **Model Configuration**:
   - Model identifier format varies by provider
   - Some providers need additional model-specific parameters
   - May need to handle model capabilities differently

4. **Streaming Setup**:
   - Some providers need special stream configuration
   - May need to specify chunk handling options
   - Usage tracking might require specific flags

5. **Provider and Model Options**:
   - Provider-level options: `CONFIG["providers"][$this->name]["options"]`
   - Model-specific options: Models can be defined in two ways:
     ```php
     "models" => [
         "model-name-1",  // String = use provider options
         "model-name-2" => [    // Array = override provider options
             "max_tokens" => 8192,
             "temperature" => 0.9
         ]
     ]
     ```
   - Model options are automatically merged with provider options in api.php
   - Model-specific options override corresponding provider options
   - No need to call getDefaultOptions() as options merging is handled automatically

#### 4. `processChunk($chunk)` and `processResponse($response)`
**When to override:**
- When your provider has a unique response format
- When you need to extract tokens/usage information differently
- When streaming responses need special handling

**Usage:**
- `processChunk()`: Used for streaming responses - processes each individual chunk of data as it arrives
- `processResponse()`: Used for non-streaming responses - processes the complete response data at once

**Example:**
```php
public function processChunk($chunk) {
    return ($data = $this->decodeData($chunk, "data")) ? [
        "content" => $data["delta"]["text"],
        "input_tokens" => $data["usage"]["input_tokens"] ?? 0,
        "output_tokens" => $data["usage"]["output_tokens"] ?? 0
    ] : null;
}

public function processResponse($response) {
    return ($data = $this->decodeData($response)) ? [
        "content" => $data["choices"][0]["message"]["content"],
        "input_tokens" => $data["usage"]["prompt_tokens"] ?? 0,
        "output_tokens" => $data["usage"]["completion_tokens"] ?? 0
    ] : null;
}
```

#### 5. `getEndpoint()`
**When to override:**
- When you need to modify the API endpoint dynamically
- When the endpoint depends on model selection or streaming mode

**Example from GoogleProvider:**
```php
public function getEndpoint() {
    return parent::getEndpoint() . $this->model . ":" . 
           ($this->stream ? "streamGenerateContent?alt=sse" : "generateContent");
}
```

#### 6. `decodeError($data)`
**When to override:**
- When your provider has a unique error response format
- When you need custom error message formatting

**Example from MistralProvider:**
```php
protected function decodeError($data) {
    return $data["object"] == "error" ? 
           (is_array($data["message"]) ? $data["message"]["detail"][0]["msg"] : $data["message"]) 
           : null;
}
```

### Implementation Strategy

1. Choose a [provider-id] string that represents your AI provider's name (e.g., 'anthropic', 'openai', 'xai'). The key must:
   - Not contain spaces
   - Use simple, descriptive names (e.g., 'mistral' for Mistral AI)
   - Can include both uppercase and lowercase letters

2. Create a `[provider-id].php` file in `lib/providers` folder.

3. Configure the new provider in lib/config.php:
   ```php
   "[provider-id]" => [
       "name"     => "Display Name",
       "apikey"   => "",  // API key or leave empty for UI input
       "endpoint" => "https://api.provider.com/v1/...",
       "models"   => [
           "model-name-1",  // Uses provider options
           "model-name-2" => [    // Model-specific options that override provider options
               "max_tokens" => 8192,
               "temperature" => 0.9
           ]
       ],
       "options"  => [  // Provider-level options (can be overridden by model options)
           "max_tokens" => 4096,  // Default maximum tokens
           "temperature" => 0.7,  // Default sampling temperature
           // Other provider-specific options like:
           // "top_p", "top_k", "repetition_penalty",
           // "truncate", "return_likelihoods", etc.
       ],
       "accumulate_tokens" => false,  // Set to true for providers that accumulate tokens in responses (e.g., X.AI)
   ]
   ```

   Models can be specified in two ways:
   1. As a string - the model will use provider-level options
   2. As a key-value pair - the model will use its specific options which override provider options

   For local providers (LM Studio, Ollama) or providers that does not require authentication, set `"apikey" => "none"` to hide the API key button.

    The `accumulate_tokens` parameter determines how token counts are handled:
    - Set to `false` (default): Provider returns non-accumulated token counts in each response
    - Set to `true`: Provider accumulates token counts across responses (e.g., X.AI Grok)

    This setting ensures accurate token usage tracking in the UI's session counter.

4. Start with minimal implementation:
```php
class NewProvider extends Provider {
    public function prepareRequest($text, $messages) {
        return [
            "model" => $this->model,
            "messages" => $messages,
            "stream" => $this->stream
        ];
        // Note: Provider and model options are automatically merged
    }
}
```

5. Add authentication if required:
```php
public function getHeaders() {
    return [
        "Authorization: Bearer " . $this->apikey()
    ];
}
```

6. Override additional methods based on provider requirements:
- Override `prepareMessage()` if you need custom message formatting
- Override `processChunk()`/`processResponse()` if response format differs
- Override `getEndpoint()` if you need dynamic endpoints
- Override `decodeError()` if error format is unique

### Best Practices

1. **Error Handling**
- Always use `ProviderUploadException` for unsupported file types
- Properly handle and format provider-specific errors
- Maintain consistent error message formatting

2. **File Handling**
- Use `isTextContent()` to detect text files
- Handle binary files (images, PDFs) according to provider capabilities
- Properly format file content for inclusion in prompts

3. **Token Management**
- Track input and output tokens accurately
- Use the provider's token counting mechanism if available
- Handle cases where token information might be missing

4. **Response Processing**
- Handle both streaming and non-streaming responses
- Extract content and token information consistently
- Maintain backward compatibility with the base class interface

5. **Configuration**
- Use the provider's configuration from `CONFIG` array
- Handle model selection and validation
- Respect provider-specific options and limitations

### Common Patterns

1. **Simple Providers**
- Only override `prepareRequest()` if using standard message format
- Example: DeepSeek, LMStudio, xAI providers

2. **Custom Authentication**
- Override `getHeaders()` to add API keys or tokens
- Example: Anthropic, Google providers

3. **Complex Message Handling**
- Override `prepareMessage()` for file uploads and special formatting
- Example: Anthropic, Google, Ollama providers

4. **Custom Response Processing**
- Override both `processChunk()` and `processResponse()`
- Example: Cohere, Groq providers

Remember to test both streaming and non-streaming modes, as well as file upload handling if supported by your provider.

## Session Configuration

The application supports two session storage modes configured in `lib/config.php`:
```php
"session" => [
    "handler" => "NativeSession",  // NativeSession or MemCacheSession
    "ttl" => ini_get('session.cookie_lifetime'), // Default 7 days
],
```

- **NativeSession**: Uses PHP native sessions (default)
- **MemCacheSession**: Uses Memcache for distributed systems
  - Requires a running Memcache server
  - Configurable TTL (Time To Live) for session data

## Extending the Application

The application uses a structured event binding system for UI elements. For example, to add a new button:

1. Add the button element to `index.php`:
```html
<button id="your-button-id"></button>
```

2. Register the button in `modules/ui.js` using the dom.$$ wrapper (a DOM element selector that enables event hook chaining):
```javascript
export const ui = {
    // ... existing buttons
    yourButton: dom.$$('#your-button-id'), // Returns element with hook() method for event binding
};

// In uiBindEvents():
ui.yourButton
    .hook('click', () => {
        // Main button functionality
        ux.handleButtonAction();
    })
    .hook('mouseover', () => {
        // Optional hover functionality
    })
    .hook('focus', () => {
        // Optional focus handling
    });
```

3. For complex functionality, implement handler methods in the appropriate module (e.g., `ux.js` for UI interactions):
```javascript
export const ux = {
    // ... existing methods
    
    handleButtonAction: () => {
        // Implementation
        // Example: Update UI state, make API calls, etc.
    }
};
```

Key considerations:
- Use the `dom.$$` wrapper for consistent event handling
- Follow the event binding pattern in `uiBindEvents()`
- Consider loading states and error handling for async operations
