/*
 * Copyright 2025 Periklis Koutsogiannis
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 * 
 * Module: chat
 * Description: Core chat functionality manager handling message display, sending, and interaction.
 */

import { settings } from './settings.js';
import { dom } from './dom.js';
import { api } from './api.js';
import { ui } from './ui.js';
import { ux } from './ux.js';
import { upload } from './upload.js';

export const chat = {

    messageDiv: null,

    displayError: (error) => {
        if (!chat.messageDiv) {
            alert(error);
        } else if (!chat.messageDiv.content) {
            chat.updateMessage(error, true);
        } else {
            chat.addMessage(error, false, true);
        }
    },

    ensureLastDebounce: () => {
        setTimeout(() =>
            chat.setMessageDivHtml(
                chat.messageDiv,
                chat.messageDiv.content
            ), settings.config.debounceTimeout);

    },

    formatContent: (content, isUser = false) => {

        // Format user messages with basic HTML escaping and line breaks
        if (isUser)
            return content
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>')
                .replace(/\t/g, '&nbsp;')

        // For assistant messages, use markdown rendering with code block enhancements
        const renderedContent = (settings.config.onContentReady ? settings.config.onContentReady(content) : content);

        return renderedContent.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (match, code) => {
            // Add copy to clipboard functionality
            return `<div class="relative">
                <span class="code-head-clip">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 11.125C2 9.676 3.176 8.5 4.625 8.5h2.25a1.125 1.125 0 0 1 0 2.25h-2.25a.375.375 0 0 0-.375.375v11.25c0 .207.168.375.375.375h11.25a.375.375 0 0 0 .375-.375v-2.25a1.125 1.125 0 0 1 2.25 0v2.25A2.625 2.625 0 0 1 15.875 25h-11.25A2.625 2.625 0 0 1 2 22.375Z" transform="translate(-1, -3)" />
                    <path d="M9.5 3.625C9.5 2.176 10.676 1 12.125 1h11.25C24.824 1 26 2.176 26 3.625v11.25A2.625 2.625 0 0 1 23.375 17.5h-11.25A2.625 2.625 0 0 1 9.5 14.875Zm2.625-.375a.375.375 0 0 0-.375.375v11.25c0 .207.168.375.375.375h11.25a.375.375 0 0 0-.375-.375V3.625a.375.375 0 0 0-.375-.375Z" transform="translate(-3, -1)" />
                </svg></span>
				<pre>${code}</pre>
			</div>`;
        });
    },

    setMessageDivHtml: (messageDiv, content = '', debounce = false) => {
        if (debounce) {
            messageDiv.debouncedUpdate(content);
        } else {
            messageDiv.innerHTML = chat.formatContent(content, messageDiv.isUser);
            settings.config.onDivReady?.(messageDiv);
            ux.scrollTo(true);
        }
    },

    addMessage: (content = '', isUser = false, isError = false) => {
        const messageDiv = dom.createDiv(null, 'message ' + (
            isError
                ? 'assistant-message error-message'
                : (isUser
                    ? 'user-message'
                    : 'assistant-message markdown-content'))
        );

        messageDiv.content = content;
        messageDiv.isUser = isUser;
        // Create debounced update function for this message
        messageDiv.debouncedUpdate = ux.debounce(function (content) {
            chat.setMessageDivHtml(this, content);
        });

        ui.chatContent.appendChild(messageDiv);

        // Cleanup previous message state
        if (chat.messageDiv) chat.messageDiv.content = null;
        chat.messageDiv = messageDiv;

        chat.setMessageDivHtml(messageDiv, content);
    },

    updateMessageDebounced: (content) => {
        setTimeout(() => {
            chat.updateMessage(content);
        }, settings.config.debounceTimeout)
    },

    updateMessage: (partialContent, isError = false) => {
        if (!chat.messageDiv) return;
        if (isError) chat.messageDiv.setAttribute('class', `${chat.messageDiv.className} error-message`);
        chat.messageDiv.content = (!isError ? chat.messageDiv.content : '') + partialContent;
        chat.setMessageDivHtml(chat.messageDiv, chat.messageDiv.content, true);
    },

    createMessageRequest: (message) => {
        api.makeRequest({
            url: api.buildUrl({
                text: message
            }),
            stream: true,
            onMessage: (data) => {
                if (data.content) {
                    chat.updateMessage(data.content);
                } else if (data.done) {
                    chat.ensureLastDebounce();
                    ux.updateInfo(data.info);
                } else if (data.error) {
                    throw new Error(data.error);
                }
            }
        }).catch((error) => {
            ux.handleError(error.message);
        }).finally(() => {
            api.abortController ??= null;
            ux.setLoading(false);
        });
    },

    abortRequest: () => {
        api.abortRequest(() => {
            chat.updateMessageDebounced('\n\nAborted.');
        });
    },

    sendMessage: () => {
        let message = ui.messageInput.value.trim();

        if (!message && !upload.files.length) {
            ux.focusMessageInput();
            return;
        }

        if (!settings.apiKey.get() && (ui.apikeyButton.style.display !== 'none')) {
            ux.saveApiKey();
            return;
        }

        ux.setLoading(true);

        ux.autoScrollCanceled = false;

        // Handle large messages by converting to file attachment
        const MAX_SIZE = 1500;
        const messageAttached = message.length > MAX_SIZE;
        let messageToSend = message;

        if (messageAttached) {
            const file = new File([message], "large-text.prompt", { type: 'text/plain' });
            upload.addFiles(file, false);
            message = '';
        }

        // Reset input states
        ui.fileInput.value = '';
        ui.messageInput.value = '';
        ux.autofitText(ui.messageInput);

        // Add user message to chat
        chat.addMessage((messageToSend + (upload.files.length && !messageAttached
            ? ` (${upload.files.length} file${(upload.files.length !== 1 ? 's' : '')} attached)`
            : ''
        )).trim(), true);

        // Prepare for assistant response
        chat.addMessage();

        // Handle file uploads before sending message
        if (upload.files.length) {
            upload.makeRequest()
                .then((response) => {
                    chat.createMessageRequest(message);
                }).catch((error) => {
                    if (error.message != "[aborted]") ux.handleError(`File upload failed: ${error.message}`);
                    ux.setLoading(false);
                }).finally(() => {
                    upload.updatePreview(true);
                });
        } else {
            chat.createMessageRequest(messageToSend);
        }
    },
}
