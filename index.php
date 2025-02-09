<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 * 
 */

include_once "lib/config.php";
?>

<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0">
	<meta name='theme-color' id='theme-color-meta'>

	<title>AiChat</title>

	<!-- dialog.css must be loaded before app.css so that the dialog styles can be overridden -->
	<link rel="stylesheet" href="css/dialog.css?<?= time() ?>">

	<link rel="stylesheet" href="css/app.css?<?= time() ?>">
	<link rel="stylesheet" href="css/app.media.css?<?= time() ?>">
	<link rel="icon" type="image/x-icon" href="favicon.ico">

	<!-- Markdown processing -->
	<script src="https://cdn.jsdelivr.net/npm/markdown-it@13.0.1/dist/markdown-it.min.js"> </script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-footnote@3.0.3/dist/markdown-it-footnote.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-emoji@2.0.2/dist/markdown-it-emoji.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-task-lists/dist/markdown-it-task-lists.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-sub@1.0.0/dist/markdown-it-sub.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-sup@1.0.0/dist/markdown-it-sup.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-deflist@2.1.0/dist/markdown-it-deflist.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-abbr@1.0.4/dist/markdown-it-abbr.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-container@3.0.0/dist/markdown-it-container.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-ins@3.0.1/dist/markdown-it-ins.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-mark@3.0.1/dist/markdown-it-mark.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-attrs@4.3.1/markdown-it-attrs.browser.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-anchor@9.2.0/dist/markdownItAnchor.umd.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/markdown-it-container@3.0.0/dist/markdown-it-container.min.js"></script>
	<link rel="stylesheet" href="css/markdown.css">

	<!-- Syntax highlighting -->
	<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
	<link rel="stylesheet" href="css/prism.css">

	<!-- Entry point -->
	<script type="module">
		import {
			app
		} from './modules/app.js';
		document.addEventListener('DOMContentLoaded', async () => {

			// If you want to use a custom markdown renderer or highlighter, 
			// you can do so by loading the necessary libraries here and 
			// assign the onContentReady and onDivReady callbacks in the app call.

			// Load markdown-it
			const markdown = window.markdownit({
				html: true,
				linkify: true,
				typographer: true,
				breaks: true
			});

			// Load markdown-it plugins
			// We assume that all markdown-it plugins start with "markdown"
			Object.keys(window).forEach((key) => {
				if (key != "markdownit" && key.startsWith('markdown')) {
					markdown.use(window[key]);
				}
			});

			// Load app and pass the callbacks
			await app({
				onContentReady: (content) => {
					// use markdown-it to render the content
					return markdown.render(content);
				},

				onDivReady: (div) => {
					// Prism is already loaded, so we can highlight the code blocks
					Prism.highlightAllUnder(div);
				},
			});
		});
	</script>
</head>

<body>
	<input type="checkbox" id="header-toggle-input">
	<label for="header-toggle-input" id="header-toggle-label">
		<svg class="icon-svg" viewBox="0 0 24 24">
			<line x1="3" y1="12" x2="21" y2="12"></line>
			<line x1="3" y1="6" x2="21" y2="6"></line>
			<line x1="3" y1="18" x2="21" y2="18"></line>
		</svg>
	</label>
	<label for="header-toggle-input" id="header-overlay"></label>
	<div id="header">
		<div id="header-menu"></div>
		<div id="header-left">
			<select id="provider-select"> </select>
			<select id="model-select"> </select>
		</div>
		<div id="header-right">
			<button id="mode-toggle-button" class="">
				<svg class="icon-svg dark-icon" viewBox="0 0 24 24">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
				</svg>
				<svg class="icon-svg light-icon" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="5"></circle>
					<line x1="12" y1="1" x2="12" y2="3"></line>
					<line x1="12" y1="21" x2="12" y2="23"></line>
					<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
					<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
					<line x1="1" y1="12" x2="3" y2="12"></line>
					<line x1="21" y1="12" x2="23" y2="12"></line>
					<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
					<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
				</svg>
			</button>
			<select id="theme-select"> </select>
			<button id="stream-toggle-button">
				<svg class="icon-svg filled" id="stream-on-icon" viewBox="0 0 24 24">
					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
				</svg>
				<svg class="icon-svg" id="stream-off-icon" viewBox="0 0 24 24">
					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
					<line x1="2" y1="2" x2="22" y2="22"></line>
				</svg>
			</button>
			<button id="apikey-button" class="white">
				<svg class="icon-svg thin-stroke" viewBox="0 0 24 24">
					<text x="12" y="18" font-family="monospace" font-size="12" fill="currentColor" text-anchor="middle">API</text>
				</svg>
			</button>
			<button id="download-button" class="white">
				<svg class="icon-svg" viewBox="0 0 24 24">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
					<polyline points="7 10 12 15 17 10"></polyline>
					<line x1="12" y1="15" x2="12" y2="3"></line>
				</svg>
			</button>
			<button id="reset-button" class="red">
				<svg class="icon-svg" viewBox="0 0 24 24">
					<path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6m12-4a9 9 0 0 1-15 6.7L3 16" />
				</svg>
			</button>
		</div>
	</div>
	<div id="chat-content">
	</div>
	<div id="footer">
		<button id="scroll-button-top" class="scroll-button scroll-button-top-area">
			<svg class="icon-svg" viewBox="0 0 24 24">
				<path d="M12 3.5L21 12.5L19.6 13.9L13 7.3V20.5H11V7.3L4.4 13.9L3 12.5L12 3.5Z" />
			</svg>
		</button>
		<button id="scroll-button-previous-message" class="scroll-button scroll-button-top-area">
			<svg class="icon-svg" viewBox="0 0 24 24">
				<path d="M17 11l-5-5-5 5" />
				<path d="M17 18l-5-5-5 5" />
			</svg>
		</button>
		<button id="scroll-button-next-message" class="scroll-button scroll-button-bottom-area">
			<svg class="icon-svg" viewBox="0 0 24 24" transform="scale(1, -1)">
				<path d="M17 11l-5-5-5 5" />
				<path d="M17 18l-5-5-5 5" />
			</svg>
		</button>
		<button id="scroll-button-bottom" class="scroll-button scroll-button-bottom-area">
			<svg class="icon-svg" viewBox="0 0 24 24" transform="scale(1, -1)">
				<path d="M12 3.5L21 12.5L19.6 13.9L13 7.3V20.5H11V7.3L4.4 13.9L3 12.5L12 3.5Z" />
			</svg>
		</button>
		<div id="input-wrapper">
			<div id="message-input-wrapper">
				<textarea id="message-input" rows="1" data-placeholder-loading="Please wait ..."></textarea>
			</div>
			<div id="input-panel">
				<div id="input-panel-left">
					<div id="file-preview"></div>
				</div>
				<div id="input-panel-right">
					<span id="session-info-span"></span>
					<input type="file" id="file-input" multiple style="display: none;">
					<button type="button" id="upload-button" class="white">
						<svg class="icon-svg" viewBox="0 0 24 24">
							<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
						</svg>
					</button>
					<button id="send-button">
						<svg class="icon-svg thick-stroke" viewBox="0 0 24 24">
							<line x1="12" y1="20" x2="12" y2="4"></line>
							<polyline points="6 10 12 4 18 10"></polyline>
						</svg>
					</button>
					<button id="abort-button" style="display: none;">
						<svg class="icon-svg thick-stroke" viewBox="0 0 24 24">
							<rect x="6" y="6" width="12" height="12" fill="currentColor"></rect>
						</svg>
					</button>
				</div>
			</div>
		</div>
	</div>
</body>

</html>