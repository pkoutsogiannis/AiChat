<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

class GoogleProvider extends Provider {

	public function getHeaders() {
		return [
			"x-goog-api-key: " . $this->apikey()
		];
	}

	public function getEndpoint() {
		return parent::getEndpoint() . $this->model . ":" . ($this->stream ? "streamGenerateContent?alt=sse" : "generateContent");
	}

	public function prepareMessage($role, $prompt) {
		$result = [];

		// https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini

		if ($role == "user") foreach ($this->uploads() as $upload) {
			if ((strpos($upload["mime"], 'text/') === 0) || in_array(strtolower($upload["mime"]), [
				'image/jpeg',
				'image/png',
				'image/gif',
				'image/webp',
				'application/pdf'
			], true) || $this->isTextContent($upload)) {
				$result[] = [
					"text" => "filename: '{$upload["name"]}'",
				];
				$result[] = [
					"inline_data" => [
						"mime_type" => $upload["mime"],
						"data" => base64_encode($upload["content"]),
					]
				];
			} else {
				throw new ProviderUploadException($upload);
			}
		}

		$result[] = [
			"text" => $prompt
		];

		return [
			"role" => $role == "assistant" ? "model" : $role,
			"parts" => $result
		];
	}

	public function prepareRequest($text, $messages) {
		return [
			"contents" => $messages,
		];
	}

	public function processChunk($chunk) {
		return ($data = $this->decodeData($chunk, "data")) ? [
			"content" => $data["candidates"][0]["content"]["parts"][0]["text"],
			"input_tokens" => $data["usageMetadata"]["promptTokenCount"] ?? 0,
			"output_tokens" => $data["usageMetadata"]["candidatesTokenCount"] ?? 0
		] : null;
	}

	public function processResponse($response) {
		return ($data = $this->decodeData($response)) ? [
			"content" => $data["candidates"][0]["content"]["parts"][0]["text"],
			"input_tokens" => $data["usageMetadata"]["promptTokenCount"] ?? 0,
			"output_tokens" => $data["usageMetadata"]["candidatesTokenCount"] ?? 0
		] : null;
	}
}
