<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

include_once "lib/config.php";

session_start();

// Increase timeout to 2 min for long API calls
set_time_limit(120);

// Configure output buffering for streaming 

// IIS: ResponseBufferLimit must be set to 0
// appcmd.exe set config "SiteName" /section:handlers "/[name='PHP_via_FastCGI'].ResponseBufferLimit:0"
// https://docs.microsoft.com/en-us/iis/configuration/system.webserver/handlers/add#responsebufferlimit

ini_set("output_buffering", "On");
ini_set('implicit_flush', "On");

// 15MB file size limit
define("MAX_FILE_SIZE", 15 * 1024 * 1024);
define("UPLOAD_DIR", "uploads/");
ini_set("upload_max_filesize", '30M');

if (!file_exists(UPLOAD_DIR)) {
	mkdir(UPLOAD_DIR, 0777, true);
}

// Translate API errors to user messages
function api_error_message($response, $status_code) {
	if (json_last_error() === JSON_ERROR_NONE && isset($response["error"])) {
		return isset($response["error"]["message"]) ? $response["error"]["message"] : "Error from API";
	}

	switch ($status_code) {
		case 401:
			return "Invalid API key.";
		case 429:
			return "Too many requests.";
		case 400:
			return "Invalid request format.";
		case 404:
			return "Endpoint or model not found.";
		default:
			return "Unable to get response from API.";
	}
}

// Process file uploads with validation
function process_uploads() {
	foreach ($_FILES["files"]["tmp_name"] as $index => $filename) {
		if (($_FILES["files"]["error"][$index] !== UPLOAD_ERR_OK) ||
			($_FILES["files"]["size"][$index] > MAX_FILE_SIZE)
		) continue;

		$result[] = [
			"name" => htmlspecialchars($_FILES["files"]["name"][$index], ENT_QUOTES, 'UTF-8'),
			"mime" => mime_content_type($filename),
			"content" => file_get_contents($filename),
		];
	}
	return $result;
}

// Helper for SSE/JSON responses
function send_message($data, $sse = true) {
	echo ($sse ? "data: " : "") . json_encode($data) . "\n\n";
	ob_flush();
	flush();
}

// Set headers for SSE/JSON
header("Content-Type: " . (isset($_REQUEST["action"]) ? "application/json" : "text/event-stream"));
header("Cache-Control: no-cache");
header("Connection: keep-alive");

$provider = null;

if ($_REQUEST["action"] === "config") {

	$config = ["providers" => CONFIG["providers"], "themes" => CONFIG["themes"], "toggles" => CONFIG["toggles"]];

	// Remove apikey and endpoint from each provider
	array_walk($config["providers"], function (&$provider) {
		$provider["apikey"] = $provider["apikey"] ? true : false;
	});

	send_message(["config" => $config], false);
	exit;
}

function createProvider() {
	return Provider::factory(
		$_REQUEST["stream"] == 1,
		strtolower($_REQUEST["provider"]),
		strtolower($_REQUEST["model"]),
		$_SERVER["HTTP_APIKEY"]
	);
}

try {
	// Initialize AI provider
	if (isset($_REQUEST["action"])) {

		if ($_REQUEST["action"] === "reset") {
			$provider = createProvider();
			$provider->reset();

			send_message(["status" => "OK"], false);
		} else if ($_REQUEST["action"] === "upload") {

			$provider = createProvider();
			$provider->setUploads($uploads = process_uploads());

			if (count($uploads) == 0) {
				header("http/1.1 413");
				exit();
			}

			send_message(["status" => "OK"], false);
		} else if ($_REQUEST["action"] === "download") {

			$provider = createProvider();

			// Handle download action
			$history = $provider->history()[1]; // Assuming history()[1] contains the conversation history

			$formattedHistory = "# Conversation History\n\n"; // Add a Markdown heading
			// Format the history into Markdown
			foreach ($history as $index => $entry) {
				$role = $entry["role"];
				$prompt = $entry["prompt"];

				if ($role == "user") {
					//$prompt = (strlen($prompt) > 160) ? substr($prompt, 0, 160) . '...' : $prompt;
					$formattedHistory .= "## {$prompt}" . "\n";
				} else {
					$formattedHistory .= $prompt . "\n";
				}
			}

			// Set the filename
			$timestamp = date("Ymd_His"); // Format: YYYYMMDD_HHMMSS
			$filename = "{$provider_name}_{$timestamp}.markdown";

			// Set headers for file download
			header("Content-Type: text/markdown");
			header("Content-Disposition: attachment; filename=\"{$filename}\"");
			header("Content-Length: " . strlen($formattedHistory));

			// Output the formatted conversation history
			echo $formattedHistory;
		} else if ($_REQUEST["action"] === "history") {

			$provider = createProvider();

			// Handle history request
			$history = $provider->history()[1] ?: [];
			send_message([
				"status" => "OK",
				"info" => $provider->info(),
				"history" => $history
			], false);
		}
	} else {

		$provider = createProvider();

		$text = null;

		if ($uploads = process_uploads()) {
			$provider->setUploads($uploads);
		}

		$uploads = $provider->uploads();
		foreach ($uploads as $key => $upload) {
			if ($upload["name"] == 'large-text.prompt') {
				$text = $upload["content"];
				unset($uploads[$key]);
				break;
			}
		}

		if ($text) {
			$provider->setUploads($uploads); // update with new uploads array 
		} else
			$text = $_REQUEST["text"];

		if (!$text && $provider->uploads()) {
			$text = "No prompt.";
		}

		if (!$text) throw new Exception("No text provided.");

		if ($_REQUEST["reset"] == 1) {
			$provider->reset();
		}

		// Set up cURL request
		$ch = curl_init($provider->getEndpoint());

		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

		curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge([
			"Content-Type: application/json",
			"Accept: application/json"
		], $provider->getHeaders()));

		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(array_merge(
			$provider->getOptions(),
			$provider->prepareRequest($text, $provider->addToHistory($text, true)[0])
		)));

		$complete_response = "";

		// Complex streaming response handling with chunked data
		if ($provider->stream) {
			$chunk_buffer = ''; // Buffer to accumulate partial chunks

			curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data) use ($provider, &$complete_response, &$chunk_buffer) {
				$provider->decodeData($data); // Validate integrity of possible json responses 

				$data_len = strlen($data);

				// Ensure chunk ends with newline after closing brace
				if ($data[-1] == "}") $data .= "\n";

				// Add new data to buffer
				$chunk_buffer .= $data;

				// Process complete chunks separated by newlines
				while (($pos = strpos($chunk_buffer, "\n")) !== false) {
					// Extract complete chunk up to newline
					$chunk = substr($chunk_buffer, 0, $pos);
					// Keep remaining partial data in buffer
					$chunk_buffer = substr($chunk_buffer, $pos + 1);

					if (strlen(trim($chunk)) === 0) continue;

					if ($result = $provider->processChunk($chunk)) {
						$provider->updateTokens($result);
						if (strlen($result["content"]) > 0) {
							$complete_response .= $result["content"];
							send_message($result);
						}
					}
				}

				return $data_len; // Required for curl callback
			});
		}

		// Execute request
		$response = curl_exec($ch);
		$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		curl_close($ch);

		if (!in_array($status, [200, 201]))
			throw new Exception(api_error_message(json_decode($response, true), $status));

		// Handle non-streaming response
		if (!$provider->stream) {
			if ($result = $provider->processResponse($response)) {
				$provider->updateTokens($result);
				if ($result["content"]) {
					$complete_response = $result["content"];
					send_message($result);
				}
			}
		}

		if (!$complete_response)
			throw new Exception("Failed to process response.");

		// Update session info
		$provider->updateInfo();

		// Update conversation history
		if ($_COOKIE[session_name()]) {
			$provider->addToHistory($complete_response, false);
		}

		send_message(["done" => true, "info" => $provider->info()]);
	}
} catch (Exception $e) {
	$error_message = $e->getMessage();
	$error_message = ucfirst($error_message) . ($error_message[-1] != "." ? "." : "");

	if (!$_REQUEST["action"]) {
		if ($provider) $provider->undoHistory();
	}
	send_message(["error" => $error_message], !$_REQUEST["action"]);
} finally {
	if (!$_REQUEST["action"]) {
		if ($provider) {
			$provider->clearUploads();
		}
	}
}
