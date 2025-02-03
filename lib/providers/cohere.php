<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

class CohereProvider extends Provider {

	protected function decodeError($data) {
		return $data["message"] ?: null;
	}

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

	public function processChunk($chunk) {
		return ($data = $this->decodeData($chunk)) ? [
			"content" => $data["text"],
			"input_tokens" => $data["response"]["meta"]["billed_units"]["input_tokens"],
			"output_tokens" => $data["response"]["meta"]["billed_units"]["output_tokens"],
		] : null;
	}

	public function processResponse($response) {
		return ($data = $this->decodeData($response)) ? [
			"content" => $data["generations"][0]["text"],
			"input_tokens" => $data["meta"]["billed_units"]["input_tokens"],
			"output_tokens" => $data["meta"]["billed_units"]["output_tokens"],
		] : null;
	}
}
