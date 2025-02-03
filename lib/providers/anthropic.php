<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

class AnthropicProvider extends Provider {

	public function getHeaders() {
		return [
			"x-api-key: " . $this->apikey(),
			"Anthropic-version: 2023-06-01"
		];
	}

	public function prepareMessage($role, $prompt) {

		// https://docs.anthropic.com/en/docs/build-with-claude/vision

		$result = [];
		if ($role == "user") foreach ($this->uploads() as $upload) {
			if ($this->isTextContent($upload)) {
				$result[] = [
					"type" => "text",
					"text" => $this->prepareTextUpload($upload)
				];
			} else if (in_array(strtolower($upload["mime"]), ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'], true)) {
				$result[] = [
					"type" => "text",
					"text" => $upload["name"],
				];
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

	public function prepareRequest($text, $messages) {
		return [
			"model" => $this->model,
			"messages" => $messages,
			"stream" => $this->stream
		];
	}

	public function processChunk($chunk) {
		return ($data = $this->decodeData($chunk, "data")) ? [
			"content" => $data["delta"]["text"],
			"input_tokens" => $data["message"]["usage"]["input_tokens"] ?? 0,
			"output_tokens" => $data["usage"]["output_tokens"] ?? 0
		] : null;
	}

	public function processResponse($response) {
		return ($data = $this->decodeData($response)) ? [
			"content" => $data["content"][0]["text"],
			"input_tokens" => $data["usage"]["input_tokens"] ?? 0,
			"output_tokens" => $data["usage"]["output_tokens"] ?? 0
		] : null;
	}
}
