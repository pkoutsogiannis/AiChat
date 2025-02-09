<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

require_once "session.php";

// Custom exception for handling unsupported file uploads with debug trace
class ProviderUploadException extends Exception {
	public function __construct($upload) {
		$trace = debug_backtrace(0, 2); // PHP 7.2 compatibility
		$callingClass = $trace[1]['class'] ?? static::class;
		$message = "File: {$upload["name"]} [{$upload["mime"]}] is not supported in {$callingClass}.";
		parent::__construct($message);
	}
}

// Core Provider functionality and interface
class Provider {

	public $name;  	// Provider name
	public $model; 	// Selected model name
	public $stream;	// Streaming mode

	private $apikey;
	private $session;	// Session handler instance

	public $config;
	private $tokens;

	public function __construct($stream, $provider, $model, $apikey = null) {
		$this->stream = $stream;
		$this->name = $provider;
		$this->model = $this->validateModel($model);
		$this->apikey = $apikey;
		$this->config = CONFIG["providers"][$this->name];
		$this->session = $this->createSessionHandler($provider, $model);
		$this->tokens = ["input" => 0, "output" => 0];
	}

	protected function createSessionHandler($provider, $model) {
		$sessionClass = CONFIG["session"]["handler"] ?: "NativeSession";
		if (!class_exists($sessionClass))
			throw new Exception("Session handler \"{$sessionClass}\" does not exist.");

		return new $sessionClass($provider, $model); // Default to PHP sessions
	}

	// Factory for creating provider instances
	static function factory($stream, $provider, $model, $apikey) {
		$providerClass = $provider . "provider";
		include_once "providers/{$provider}.php";
		if (!class_exists($providerClass))
			throw new Exception("Provider \"{$providerClass}\" does not exist.");
		return new $providerClass($stream, $provider, $model, $apikey);
	}

	// Validate model selection against provider config
	protected function validateModel($model) {
		$models = CONFIG["providers"][$this->name]["models"];

		$keys = array_keys($models);
		$values = array_values($models);

		// If numeric key exists, it's a simple array
		if (isset($models[$model])) {
			return $model;
		}

		// Check if model exists as a value in array
		$index = array_search(strtolower($model), array_map('strtolower', $values));
		if ($index !== false) {
			// If it's an associative array, return the key
			if ($keys !== range(0, count($values) - 1)) {
				return $keys[$index];
			}
			return $model;
		}

		throw new Exception("Model \"{$model}\" is not available for provider \"{$this->name}\".");
	}

	public function getOptions() {
		$models = CONFIG["providers"][$this->name]["models"];
		$options = $models[$this->model] ?? null;

		// If model has options, override provider options
		return $options ??  ($this->config["options"] ?? []);
	}

	// Get provider API key from config
	protected function apikey() {
		$result = $this->config["apikey"] ?: $this->apikey;
		if (!$result)
			throw new Exception("The API key for " . $this->config["name"] . " is not set.");
		return $result;
	}

	// Parse JSON responses with optional data prefix handling
	public function decodeData($data, $prefix = null) {
		$prefix .= ":";
		if (!is_null($prefix) && substr($data, 0, strlen($prefix)) === $prefix) {
			$result = json_decode(substr($data, strlen($prefix)), true);
		} else {
			$result = json_decode($data, true);
		}

		if ($error = $this->decodeError($result))
			throw new Exception($error);

		return $result;
	}

	// Clear session state
	public function reset() {
		$this->session->clear();
	}

	// Get uploaded files
	public function uploads() {
		return $this->session->get("uploads");
	}

	// Store uploaded files
	public function setUploads($uploads) {
		$this->session->set("uploads", $uploads);
	}

	// Clear uploaded files
	public function clearUploads() {
		$this->session->clear("uploads");
	}

	// Get conversation history
	// history[0] contains the complete prompts
	// history[1] contains the raw text messages
	public function history() {
		return $this->session->get("history") ?? [];
	}

	// Add message to conversation history and update clear text messages
	public function addToHistory($text, $user) {
		$role = $user ? "user" : "assistant";
		$message = $this->prepareMessage($role, $text);

		$history = $this->history();

		$history[0][] = $message;

		$prompt = $text ?: $message["content"];

		$history[1][] = [
			"role" => $role,
			"prompt" => $prompt
		];

		$this->session->set("history", $history);

		return $history;
	}

	// Remove last message from history
	public function undoHistory() {
		$history = $this->history();
		array_pop($history[0]);
		array_pop($history[1]);
		$this->session->set("history", $history);
	}

	// Get usage info and costs
	public function info() {
		return $this->session->get("info") ?? [];
	}

	// Track token usage 
	public function updateTokens(&$result) {
		$this->tokens["input"] = ($this->config["accumulate_tokens"] ? 0 : $this->tokens["input"]) + $result["input_tokens"] ?? 0;
		$this->tokens["output"] = ($this->config["accumulate_tokens"] ? 0 : $this->tokens["output"]) + $result["output_tokens"] ?? 0;

		unset($result["input_tokens"], $result["output_tokens"]);
	}

	public function updateInfo() {
		$info = $this->session->get("info");
		$info["input_tokens"] += $this->tokens["input"];
		$info["output_tokens"] += $this->tokens["output"];
		$this->session->set("info", $info);
	}

	// Sophisticated text content detection with UTF-8 awareness
	protected function isTextContent($upload, $threshold = 0.7) {
		if (strpos($upload["mime"], "text/") === 0) return true;

		$content = $upload["content"];

		if (strpos($content, "\x00") !== false) return false; // Binary check

		$sample = substr($content, 0, min(512, strlen($content)));
		if (empty($sample)) return false;

		// UTF-8 aware printable character detection
		$pattern = '/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]|[\xC2-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF4][\x80-\xBF]{3}/';
		$printable = strlen(preg_replace($pattern, '', $sample));

		return ($printable / strlen($sample)) >= $threshold;
	}

	// Format text file for prompt inclusion
	protected function prepareTextUpload($upload) {
		if (substr($upload["name"], -strlen('.prompt')) === '.prompt') {
			$upload["prompt"] = true;
			return null;
		} else {
			return "[start of file named \"{$upload["name"]}\"]\n\n" . $upload["content"] . "\n\n[end of file named \"{$upload["name"]}\"]\n\n";
		}
	}

	// Provider-specific methods

	public function getHeaders() {
		return $this->apikey() ? [
			"Authorization: Bearer " . $this->apikey()
		] : [];
	}

	// Get provider endpoint from config
	public function getEndpoint() {
		return $this->config["endpoint"];
	}

	protected function decodeError($data) {
		return $data["error"]
			? is_array($data["error"])
			? ($data["error"]["message"] . ($data["error"]["param"] ? ":" . $data["error"]["param"] : ""))
			: $data["error"]
			: null;
	}

	// Combine file contents with prompt and create a message
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

	public function prepareRequest($text, $messages) {
		return [
			"model" => $this->model,
			"messages" => $messages,
			"stream" => $this->stream
		];
	}

	public function processChunk($chunk) {
		return ($data = $this->decodeData($chunk, "data")) ? [
			"content" => $data["choices"][0]["delta"]["content"],
			"input_tokens" => $data["usage"]["prompt_tokens"] ?? 0,
			"output_tokens" => $data["usage"]["completion_tokens"] ?? 0,
		] : null;
	}

	public function processResponse($response) {
		return ($data = $this->decodeData($response)) ? [
			"content" => $data["choices"][0]["message"]["content"],
			"input_tokens" => $data["usage"]["prompt_tokens"] ?? 0,
			"output_tokens" => $data["usage"]["completion_tokens"] ?? 0,
		] : null;
	}
}
