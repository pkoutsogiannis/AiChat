<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

class OpenAiProvider extends Provider {

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
}
