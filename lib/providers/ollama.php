<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

class OllamaProvider extends Provider {

	public function prepareMessage($role, $prompt) {
		$result = [];

		$text_files = "";
		$binary_files = [];
		if ($role == "user") foreach ($this->uploads() as $upload) {
			if ($this->isTextContent($upload)) {
				$text_files .= $this->prepareTextUpload($upload);
			} else if (in_array(strtolower($upload["mime"]), ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], true)) {
				$binary_files["names"][] = $upload["name"];
				$binary_files["contents"][] = base64_encode($upload["content"]);
			} else {
				throw new ProviderUploadException($upload);
			}
		}

		$result = [
			"role" => $role,
			"content" => ($text_files ? $text_files . "\n" : "") . (!empty($binary_files) ? "file names: " . implode(",", $binary_files["names"]) . "\n\n" : "") . $prompt,
		];

		if ($binary_files["contents"])
			$result["images"] = $binary_files["contents"];

		return $result;
	}

	public function prepareRequest($text, $messages) {
		return [
			"model" => $this->model,
			"messages" => $messages,
			"stream" => $this->stream
		];
	}

	public function processChunk($chunk) {
		return ($data = $this->decodeData($chunk)) ? [
			"content" => $data["message"]["content"],
		] : null;
	}

	public function processResponse($response) {
		return ($data = $this->decodeData($response)) ? [
			"content" => $data["message"]["content"],
		] : null;
	}
}
