<?
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

error_reporting(E_ERROR | E_PARSE);

ini_set('session.cookie_lifetime', 604800); // 7 days

include_once "system.php"; // optional - use your own uncommited code here 
include_once "provider.php";

// Add your own apikeys or leave them empty to set them in the locally in the client.

define("CONFIG", [
	"session" => [
		"handler" => "NativeSession",  // NativeSession or MemCacheSession
		"ttl" => ini_get('session.cookie_lifetime'),
	],
	"providers" => [
		"anthropic" => [
			"name"     => "Claude",
			"apikey"   => "",
			"endpoint" => "https://api.anthropic.com/v1/messages",
			"options" => [
				"max_tokens" => 4096
			],
			"models"   => [
				"claude-3-5-sonnet-latest",
				"claude-3-5-haiku-latest",
				"claude-3-opus-latest",
			],
		],
		"openai" => [
			"name"     => "ChatGPT",
			"apikey"   => "",
			"endpoint" => "https://api.openai.com/v1/chat/completions",
			"options" => [
				"max_completion_tokens" => 4096
			],
			"models"   => [
				"o3-mini",
				"o1-mini",
				"gpt-4o",
				"chatgpt-4o-latest"
			],
		],
		"deepseek" => [
			"name"     => "DeepSeek",
			"apikey"   => "",
			"endpoint" => "https://api.deepseek.com/chat/completions",
			"options" => [
				"max_tokens" => 4096
			],
			"models"   => [
				"deepseek-chat",
				"deepseek-reasoner"
			],
		],
		"google" => [
			"name"     => "Gemini",
			"apikey"   => "",
			"endpoint" => "https://generativelanguage.googleapis.com/v1beta/models/",
			"options" => [
				"generationConfig" => [
					"temperature" => 0.7,
					"maxOutputTokens" => 4096,
					"stopSequences" => []
				],
				"safetySettings" => []
			],
			"models"   => [
				"gemini-2.0-flash-exp",
				"gemini-2.0-flash-thinking-exp-1219",
				"gemini-2.0-flash-thinking-exp-01-21",
				"gemini-1.5-flash"
			],
		],
		"mistral" => [
			"name"     => "Mistral",
			"apikey"   => "",
			"endpoint" => "https://api.mistral.ai/v1/chat/completions",
			"options" => [
				"max_tokens" => 4096
			],
			"models"   => [
				"mistral-large-latest"
			],
		],
		"cohere" => [
			"name"     => "CoHere",
			"apikey"   => "",
			"endpoint" => "https://api.cohere.ai/v1/generate",
			"options" => [
				"temperature" => 0.7,
				"max_tokens" => 2048,
				"truncate" => "END",
				"return_likelihoods" => "NONE",
				"stop_sequences" => ["Human:", "Assistant:"],
			],
			"models"   => [
				"command-r-plus-08-2024",
				"command-r-08-2024"
			],
		],
		"xai" => [
			"name"     => "Grok",
			"apikey"   => "",
			"endpoint" => "https://api.x.ai/v1/chat/completions",
			"options" => [
				"max_tokens" => 4096
			],
			"models"   => [
				"grok-beta",
				"grok-2-latest"
			],
			"accumulate_tokens" => true,
		],
		"groq" => [
			"name"     => "Groq",
			"apikey"   => "",
			"endpoint" => "https://api.groq.com/openai/v1/chat/completions",
			"options" => [
				"max_tokens" => 4096
			],
			"models"   => [
				"llama-3.3-70b-versatile",
				"mixtral-8x7b-32768"
			],
		],
		"together" => [
			"name"     => "Together",
			"apikey"   => "",
			"endpoint" => "https://api.together.xyz/v1/chat/completions",
			"options" => [
				"max_tokens" => null,
				"temperature" => 0.7,
				"top_p" => 0.7,
				"top_k" => 50,
				"repetition_penalty" => 1,
				"stop" => [
					"<|eot_id|>",
					"<|eom_id|>"
				],
			],
			"models"   => [
				"meta-llama/Llama-3.3-70B-Instruct-Turbo",
				"deepseek-ai/deepseek-llm-67b-chat",
				"deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
			],
		],
		"lmstudio" => [
			"name"     => "LM Studio",
			"apikey"   => "none", // does not require authentication - "none" hides the apikey button in the client 
			"endpoint" => "http://127.0.0.1:1234/v1/chat/completions",
			"options" => [
				"max_tokens" => 4096,
				"stream_options" => [
					"include_usage" => true,
				]
			],
			"models"   => [
				"mistral-7b-instruct-v0.3",
				"llama-3.2-3b-instruct",
				"granite-3.1-8b-instruct",
				"phi-3.1-mini-128k-instruct"
			],
		],
		"ollama" => [
			"name"     => "Ollama",
			"apikey"   => "none", // does not require authentication - "none" hides the apikey button in the client 
			"endpoint" => "http://127.0.0.1:11434/api/chat",
			"models"   => [
				"deepseek-r1:8b",
				"llama3.2:3b",
				"llama3.1",
				"llava:13b"
			],
		],
	],
	"themes" => [
		"royal-purple",
		"marine-pro",
		"slate-frost",
		"frost-azure",
		"arctic-aurora",
		"warm-earth",
		"tech-cyan",
		"forest-green",
		"mint-breeze",
		"sunset-glow",
		"cosmic-night",
		"desert-breeze",
	],
	"toggles" => [
		"dark" => false,
		"stream" => true
	]

]);
