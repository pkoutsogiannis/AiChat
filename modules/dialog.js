/*
 * Copyright 2025 Periklis Koutsogiannis
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: dialog.js
 * Author: Periklis Koutsogiannis
 * 
 * Description: Provides a Promise-based API for showing dialogs with customizable content,
 * buttons, and event handling.
 * 
 * Source, documentation and examples: https://github.com/pkoutsogiannis/dialog.js
 */

export class dialog {
    // Private static fields for managing dialog state
    static #overlay;
    static #$;
    static #dialog;
    static #resolvePromise;
    static #events;
    static #buttonHandlers = new Map();
    static POSTPONE = Symbol('postpone');

    // Predefined CSS classes for different types of dialog buttons.
    static buttonClass = {
        left: 'dialog-left',
        submit: 'dialog-submit',
        cancel: 'dialog-cancel',
    }

    // Icon CSS classes mapping
    static iconClass = {
        success: 'dialog-icon-success',
        error: 'dialog-icon-error',
        warning: 'dialog-icon-warning',
        info: 'dialog-icon-info',
        custom: 'dialog-icon-custom'
    }

    // Factory methods for creating common button configurations.
    static button = {
        submit: (text = 'OK') => ({ text, cls: [this.buttonClass.submit] }),
        close: (text = 'Close') => this.button.submit(text),
        cancel: (text = 'Cancel') => ({ text, cls: [this.buttonClass.cancel] }),
    };

    // Updates the dialog position to stay within overlay bounds.
    // Called after dragging ends and on window resize.
    static #updatePosition() {
        if (!this.#dialog) return;

        // Reset to center position if dialog was not dragged
        if (this.#dialog.style.transform === 'translate(-50%, -50%)') return;

        const currentX = parseFloat(this.#dialog.style.left);
        const currentY = parseFloat(this.#dialog.style.top);
        const { x, y } = this.#calculatePosition(currentX, currentY);

        this.#dialog.style.left = `${x}px`;
        this.#dialog.style.top = `${y}px`;
    }

    // Calculates the constrained position for the dialog within the overlay bounds.
    // Takes into account margins and dialog dimensions.
    static #calculatePosition(x, y) {
        const rect = this.#dialog.getBoundingClientRect();
        const overlayRect = this.#overlay.getBoundingClientRect();
        const margin = parseInt(getComputedStyle(this.#dialog).getPropertyValue('--dialog-padding')) || 0;

        // Calculate maximum allowed positions
        const maxX = overlayRect.width - rect.width;
        const maxY = overlayRect.height - rect.height;

        // Keep dialog within overlay bounds with margin
        return {
            x: Math.max(margin, Math.min(x, maxX - margin)),
            y: Math.max(margin, Math.min(y, maxY - margin))
        };
    }

    // Creates the dialog DOM structure if it doesn't exist and 
    // sets up the overlay and dialog container elements.
    static #createDialog() {
        if (this.#overlay) return;

        this.#overlay = document.createElement('div');
        this.#overlay.className = 'dialog-overlay';

        this.#dialog = document.createElement('div');
        this.#dialog.className = 'dialog';
        this.#dialog.tabIndex = 0;
        this.#dialog.style.position = 'absolute';
        this.#dialog.style.left = '50%';
        this.#dialog.style.top = '50%';
        this.#dialog.style.transform = 'translate(-50%, -50%)';

        document.body.appendChild(this.#overlay);
        this.#overlay.appendChild(this.#dialog);

        // Add drag functionality
        let isDragging = false;
        let dragOffsetX;
        let dragOffsetY;

        const dragStart = (e) => {
            if (!e.target.classList.contains('dialog-title')) return;
            isDragging = true;

            const rect = this.#dialog.getBoundingClientRect();
            const overlayRect = this.#overlay.getBoundingClientRect();

            // Calculate current position relative to overlay
            const currentX = rect.left - overlayRect.left;
            const currentY = rect.top - overlayRect.top;

            // Set initial position before removing transform
            this.#dialog.style.left = `${currentX}px`;
            this.#dialog.style.top = `${currentY}px`;
            this.#dialog.style.transform = 'none';

            // Calculate drag offset after setting position
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;

            this.#dialog.style.transition = 'none';
            this.#dialog.querySelector(".dialog-title").style.cursor = 'grabbing';
        };

        const dragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            this.#dialog.style.transition = '';
            this.#dialog.querySelector(".dialog-title").style.cursor = '';
            this.#updatePosition();
        };

        const drag = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const overlayRect = this.#overlay.getBoundingClientRect();
            const rawX = e.clientX - dragOffsetX - overlayRect.left;
            const rawY = e.clientY - dragOffsetY - overlayRect.top;

            // Use calculatePosition to constrain coordinates
            const { x, y } = this.#calculatePosition(rawX, rawY);

            // Update position
            this.#dialog.style.left = `${x}px`;
            this.#dialog.style.top = `${y}px`;
        };

        this.#dialog.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
    }

    // Manages dialog show/hide transitions with animation.
    // Handles cleanup and promise resolution when closing.
    static async #handleTransition(show, value = null) {
        if (show) {
            this.#overlay.style.display = 'flex';
            requestAnimationFrame(() => this.#overlay.classList.add('dialog-show'));
            return;
        }

        await Promise.resolve(this.#events.onUnload?.(this.#$));

        this.#overlay.classList.remove('dialog-show');
        await new Promise(resolve => setTimeout(resolve, parseFloat(getComputedStyle(this.#dialog).transitionDuration) * 1000));

        if (this.#resolvePromise) {
            this.#overlay.style.display = 'none';
            this.#cleanup();
            this.#resolvePromise(value);
            this.#resolvePromise = null;
            this.#events = null;
        }
    }

    // Cleans up dialog resources and event listeners.
    static #cleanup() {
        if (this.#events.keyHandler) {
            document.removeEventListener('keydown', this.#events.keyHandler);
        }
        if (this.#events.resizeHandler) {
            window.removeEventListener('resize', this.#events.resizeHandler);
        }
        if (this.#overlay && this.#overlay.parentNode === document.body) {
            document.body.removeChild(this.#overlay);
        }
        this.#overlay = null;
        this.#dialog = null;
    }

    // Sanitizes text content to prevent XSS attacks.
    static escapeHtml(text) {
        return text
            ? text.replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[char])
            : "";
    }

    // Creates a title element for the dialog.
    static createTitle(title, spacer = true) {
        return `<div class='dialog-title ${spacer ? "dialog-spacer" : ""}'>${this.escapeHtml(title)}</div>`;
    }

    // Creates a button element for the dialog.
    static createButton({
        id = '',
        cls = [],
        style = '',
        text = 'OK',
        onClick = null
    }) {
        id = id || crypto.randomUUID().toString();
        if (onClick) this.#buttonHandlers.set(id, onClick);
        return `<button id="${id}" class="dialog-button ${cls.join(' ')}" style="${style ? style : ''}">${this.escapeHtml(text)}</button>`;
    }

    // Creates a container with multiple buttons for the dialog.
    static createButtons(buttons, spacer = true) {
        return `<div class="dialog-buttons ${spacer ? 'dialog-spacer' : ''}">
            ${buttons.map(button => this.createButton(button)).join('\n')}
        </div>`;
    }

    // Main method for displaying a dialog.
    static async show({
        title = '',
        content = '',
        buttons = [],
        spacer = { top: false, bottom: true },
        onLoad = null,
        onUnload = null,
        onSubmit = null,
        onCancel = null,
        onClick = null
    }) {

        this.#createDialog();

        return new Promise(resolve => {
            this.#resolvePromise = resolve;

            // Create a $ object with cached query selectors scoped to the dialog
            this.#$ = selector => this.#dialog.querySelector(selector);
            this.#$.all = selector => this.#dialog.querySelectorAll(selector);

            // Replace content with template content if it starts with ::
            // The template content is expected to be inside a hidden container with class 'dialog-templates'
            // and an id matching the selector after the '::' prefix.
            // Example: '::my-template' will look for an element with id 'my-template' inside '.dialog-templates'
            // If no matching element is found, the content is used as is.

            if (content.startsWith('::')) {
                // Extract the selector (everything after ::)
                const selector = content.substring(2).trim().split(/\s+/)[0];
                // Find the element with the matching selector
                const element = document.querySelector(`.dialog-templates > #${selector}`)
                // If element exists, use its innerHTML as content
                content = element?.innerHTML ?? content;
            }

            this.#dialog.innerHTML = `
            ${this.createTitle(title, spacer.top)}
                <div class='dialog-content'>
                    ${content}
                </div>`;

            if (buttons.length > 0) {
                this.#dialog.innerHTML += this.createButtons(buttons, spacer.bottom);
            }

            this.#events = { onLoad, onUnload, onSubmit, onClick, onCancel };

            // Handle submit button click
            const handleSubmit = async (e) => {
                if (this.#events.onSubmit) {
                    const result = await this.#events.onSubmit(this.#$);
                    if (result === this.POSTPONE) return;
                    await this.close(result);
                } else {
                    await this.close();
                }
            };

            // Handle cancel button click
            const handleCancel = async () => {
                if (this.#events.onCancel) {
                    const result = await this.#events.onCancel(this.#$);
                    if (result === this.POSTPONE) return;
                }
                await this.close();
            };

            // Handle custom button click
            const handleClick = async (e) => {
                const handler = this.#buttonHandlers.get(e.target.id);
                if (handler) {
                    await handler(this.#$);
                }
            };

            // Handle form submissions
            this.#$.all('form').forEach(form => form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleSubmit();
            }));

            // Attach event listeners to submit buttons
            this.#dialog.querySelectorAll('.dialog-submit').forEach(button => {
                button.addEventListener('click', handleSubmit);
            });

            // Attach event listeners to cancel buttons
            this.#dialog.querySelectorAll('.dialog-cancel').forEach(button => {
                button.addEventListener('click', handleCancel);
            });

            // Attach event listeners to custom buttons
            this.#dialog.querySelectorAll('.dialog-button:not(.dialog-submit)').forEach(button => {
                button.addEventListener('click', handleClick);
            });

            // Attach click event listener to overlay
            this.#overlay.addEventListener('mousedown', async (e) => {
                if (e.target === this.#overlay) await handleCancel();
            });

            // Handle key events and save the assigned handler for cleanup
            this.#events.keyHandler = async (e) => {
                if (e.key === 'Escape')
                    await handleCancel()
                else if (e.key === 'Enter') {
                    if (!e.target.classList.contains('dialog-stop-propagation')) {
                        await handleSubmit();
                    }
                }
            };
            document.addEventListener('keydown', this.#events.keyHandler);

            // Add resize handler
            this.#events.resizeHandler = () => this.#updatePosition();
            window.addEventListener('resize', this.#events.resizeHandler);


            // Handle dialog transition
            this.#handleTransition(true);

            // Handle focus management
            const focusElement = this.#dialog.querySelector('.dialog-focus');
            if (focusElement) {
                focusElement.focus();
                if (focusElement instanceof HTMLInputElement || focusElement instanceof HTMLTextAreaElement) {
                    focusElement.select();
                }
            } else {
                this.#dialog.querySelector('.dialog-submit')?.focus();
            }

            // Call onLoad callback
            this.#events.onLoad?.(this.#$);
        });
    }

    // Closes the currently open dialog.
    static async close(value = null) {
        if (this.#resolvePromise) {
            this.#buttonHandlers.clear();
            await this.#handleTransition(false, value);
        }
    }

    // Convenience method for showing a simple alert dialog.
    static async alert({
        title = '',
        message = '',
        buttonText = 'OK',
        iconClass = '',  // Use dialog.iconClass.{type}
        icon = ''       // Used when iconClass is dialog.iconClass.custom
    }) {
        let iconHtml = '';

        // Creates an icon element for the dialog
        const createIcon = (iconClass, customContent = '') => {
            if (!iconClass) return '';
            return `<div class="dialog-icon ${iconClass}">${customContent}</div>`;
        }

        if (iconClass) {
            if (iconClass === this.iconClass.custom && icon) {
                iconHtml = createIcon(iconClass, icon);
            } else {
                iconHtml = createIcon(iconClass);
            }
        }

        const contentHtml = `
            <div class="dialog-alert-content">
                ${iconHtml}
                <div class="dialog-message">${message}</div>
            </div>
        `;

        return await this.show({
            title: title,
            spacer: { bottom: false },
            content: contentHtml,
            buttons: [this.button.submit(buttonText)],
        });
    }

    // Convenience method for showing a simple prompt dialog.
    static async prompt({
        title = '',
        message,
        defaultValue = '',
        okText = 'OK',
        cancelText = 'Cancel',
        spacerTop = false,
        spacerBottom = false
    } = {}) {

        return await this.show({
            title: title,
            spacer: { top: spacerTop, bottom: spacerBottom },
            content: `
                <div style="padding-bottom:8px">${message}</div>
                <input class="dialog-input dialog-focus" style="width:100%" value="${defaultValue}">
            `,
            buttons: [
                this.button.submit(okText),
                this.button.cancel(cancelText),
            ],
            onSubmit: ($) => {
                return $('.dialog-input').value || dialog.POSTPONE;
            }
        });
    }
}
