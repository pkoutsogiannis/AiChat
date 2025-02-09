<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

class MistralProvider extends Provider {

	protected function decodeError($data) {
		return $data["object"] == "error" ? (is_array($data["message"]) ? $data["message"]["detail"][0]["msg"] : $data["message"]) : null;
	}

	public function prepareRequest($text, $messages) {
		return [
			"model" => $this->model,
			"messages" => $messages,
			"stream" => $this->stream
		];
	}
}
