<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

class GroqProvider extends Provider {

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
			"input_tokens" => $data["x_groq"]["usage"]["prompt_tokens"] ?? 0,
			"output_tokens" => $data["x_groq"]["usage"]["completion_tokens"] ?? 0,
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
