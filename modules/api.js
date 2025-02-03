/*
 * Copyright 2025 Periklis Koutsogiannis
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 * 
 * Module: api
 * Description: Handles all API communication and request management for the chat functionality.
 */

import { settings } from './settings.js';
import { ui } from './ui.js';

export const api = {

    abortController: null,

    buildUrl: (additionalParams) => {
        const url = new URL(settings.config.endpoint, window.location.href);
        const params = {
            provider: ui.providerSelect.value,
            model: ui.modelSelect.value,
            stream: settings.config?.toggles?.stream ? 1 : 0,
            ...additionalParams,
        };

        Object.keys(params).forEach((key) => url.searchParams.set(key, params[key]));

        return url.toString();
    },

    makeRequest: async (options) => {
        const headers = {
            apikey: settings.apiKey.get(),
            ...options.headers
        };

        let body = options.data;
        if (options.data && !(options.data instanceof FormData)) {
            body = JSON.stringify(options.data);
            headers['Content-Type'] = 'application/json';
        }

        // Create new abort controller for this request
        api.abortController = new AbortController();

        try {
            // Special handling for file uploads to show progress
            if (body instanceof FormData) {
                return await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            options?.onProgress({
                                loaded: event.loaded,
                                total: event.total,
                                percentComplete: Math.round((event.loaded / event.total) * 100)
                            });
                        }
                    };

                    xhr.onload = async () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                resolve(JSON.parse(xhr.responseText));
                            } catch (error) {
                                reject(new Error(`Decoding error [${error.message}]`));
                            }
                        } else {
                            let errorMessage;
                            switch (xhr.status) {
                                case 413:
                                    errorMessage = 'File(s) are too large.';
                                    break
                                case 415:
                                    errorMessage = 'Unsupported file type.';
                                    break
                                default:
                                    errorMessage = `HTTP-ERROR [${xhr.status}]`;
                            }

                            reject(new Error(errorMessage));
                        }
                    };

                    xhr.onerror = () => reject(new Error('Network error occurred'));
                    xhr.onabort = () => reject(new Error('[aborted]'));

                    xhr.open(options.method || 'GET', options.url);

                    // Add headers
                    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);

                    // Connect abort controller to xhr for cancellation
                    api.abortController.signal.addEventListener('abort', () => xhr.abort());

                    xhr.send(body);
                });
            }

            // For streaming responses or regular requests without file upload
            const response = await fetch(options.url, {
                method: options.method || 'GET',
                headers: headers,
                body: body,
                signal: api.abortController.signal,
            });

            if (!response.ok) throw new Error(`HTTP-ERROR [${response.status}]`);

            // Handle streaming responses using ReadableStream
            if (options.stream) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    // Split on double newline to handle SSE format
                    const lines = decoder.decode(value, { stream: true }).split('\n\n');

                    for (const line of lines) {
                        if (line.trim() === '') continue;

                        if (line.startsWith('data:')) {
                            try {
                                options.onMessage?.(JSON.parse(line.slice(5).trim()));
                            } catch (error) {
                                throw new Error(error.message);
                            }
                        } else {
                            throw new Error(`Invalid data [${line}]`);
                        }
                    }
                }
            } else {
                const result = await response.json();
                if (result.error) throw new Error(result.error);
                return result;
            }
        } catch (error) {
            if (error.name !== 'AbortError') throw error; // Propagate non-abort errors
        } finally {
            api.abortController = null; // Clean up abort controller
        }
    },

    abortRequest: (callback) => {
        if (api.abortController) {
            api.abortController.abort();
            callback?.();
        }
    },

};
