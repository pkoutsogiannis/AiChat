/*
 * Copyright 2025 Periklis Koutsogiannis
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 * 
 * Module: ux
 * Description: User experience and interaction management system.
 */

import { settings } from './settings.js';
import { dom } from './dom.js';
import { ui } from './ui.js';
import { chat } from './chat.js';
import { upload } from './upload.js';
import { dialog } from './dialog.js';

export const ux = {

    autoScrollCanceled: false,

    //#region Error Handling

    handleError: (error) => {
        try {
            console.error(error); // Log to console as a fallback
            chat.displayError(error);
        } catch (e) {
            console.error("Failed to display error in UI");
        }
    },

    //#endregion

    //#region Input & Text Management

    autofitText: (textarea) => {
        const maxLines = 10;
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
        const maxHeight = lineHeight * maxLines;

        if (!textarea.value.trim()) {
            textarea.rows = 1;
            textarea.style.height = '';
            textarea.style.minHeight = '';
            textarea.style.maxHeight = '';
            textarea.style.overflowY = 'hidden';
            return;
        }

        // Reset height to calculate proper scrollHeight
        textarea.rows = 1;

        const currentLines = Math.floor(textarea.scrollHeight / lineHeight);
        textarea.rows = Math.min(currentLines, maxLines);

        // Enable scrolling if content exceeds max lines
        if (currentLines > maxLines) {
            textarea.style.overflowY = 'auto';
            textarea.style.height = maxHeight + 'px';
        } else {
            textarea.style.overflowY = 'hidden';
            textarea.style.height = 'auto';
        }
    },

    setSwipeHandler: (swipeDistance, callback) => {
        let touchStartX = 0;
        let touchEndX = 0;
        let touchTarget = null;

        const handleSwipe = () => {
            const deltaX = touchEndX - touchStartX;
            // Scale the swipe distance based on viewport width to account for zoom
            const scaledDistance = swipeDistance * (document.documentElement.clientWidth / window.innerWidth);

            if (Math.abs(deltaX) > scaledDistance) {
                callback(deltaX);
            }
        };

        document.addEventListener('touchstart', (event) => {
            touchTarget = event.target;
            touchStartX = event.changedTouches[0].clientX;
        });

        document.addEventListener('touchend', (event) => {
            // Ignore swipes on scrollable elements
            if (touchTarget && (
                touchTarget.scrollWidth > touchTarget.clientWidth ||
                touchTarget.closest('.chat-content, textarea, select'))) return;

            touchEndX = event.changedTouches[0].clientX;
            handleSwipe();
        });
    },

    //#endregion

    //#region Theme & Toggle Management

    updateToggle: (name) => {
        document.documentElement.setAttribute(`data-${name}`, settings.config.toggles[name] ? 'on' : 'off');
    },

    switchToggle: (name) => {
        settings.config.toggles[name] = !settings.config.toggles[name];
        settings.toggle.set(name, settings.config.toggles[name]);
        ux.updateToggle(name);
        ux.focusMessageInput();
    },

    setBrowserColor: () => {
        const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--background-color-header').trim();
        document.getElementById('theme-color-meta').setAttribute('content', themeColor);
    },

    applyTheme: (theme) => {
        const currentThemeLink = document.querySelector('link[rel="stylesheet"][href^="css/themes/"]');
        const newThemeLink = document.createElement('link');

        newThemeLink.rel = 'stylesheet';
        newThemeLink.href = `css/themes/${theme}.css`;
        newThemeLink.onload = () => {
            if (currentThemeLink) currentThemeLink.remove();
            document.body.setAttribute('data-theme', theme);
            ux.setBrowserColor();
        };
        document.head.appendChild(newThemeLink);

        settings.theme.set(theme);
        ui.themeSelect.value = theme;
    },

    //#endregion

    //#region UI State Management

    debounce: (func, timeout = settings.config.debounceTimeout) => {
        let lastCallTime = 0;
        return function () {
            // if it is the first call or the last call was more than the wait time ago
            if ((lastCallTime === 0) || ((Date.now() - lastCallTime) > timeout)) {
                lastCallTime = Date.now();
                setTimeout(() => func.apply(this, arguments), 0); // make it an async call
            } // else bounce
        };
    },

    resetUi: () => {
        chat.messageDiv = null;
        chat.selectedFiles = [];

        ui.chatContent.innerHTML = '';
        ui.messageInput.value = '';
        ui.messageInput.setAttribute('data-placeholder-default', `Ask ${ui.providerSelect.options[ui.providerSelect.selectedIndex].text} ...`);
        ux.autofitText(ui.messageInput);

        ux.updateInfo();
        ux.updateScrollButtons();
        upload.updatePreview();
    },

    focusMessageInput: () => {
        // Only auto-focus on desktop to avoid mobile keyboard pop-up
        if (!dom.isMobile()) {
            ui.messageInput.focus();
        }
    },

    updateInfo: (info) => {
        ui.sessionInfoSpan.textContent = info && info.input_tokens ? `${info.input_tokens}/${info.output_tokens}` : '0/0';
    },

    //#endregion

    //#region Scroll & Navigation

    smoothScroll: (element, targetScrollTop, duration = 300) => {

        const easeInOutQuad = (t) => {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        };

        const startScrollTop = element.scrollTop;
        const distance = targetScrollTop - startScrollTop;
        let startTime = null;

        const animateScroll = (currentTime) => {
            if (!startTime) {
                startTime = currentTime;
            }

            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1); // Ensure progress doesn't exceed 1
            const easedProgress = easeInOutQuad(progress);

            element.scrollTop = startScrollTop + distance * easedProgress;

            if (timeElapsed < duration) {
                requestAnimationFrame(animateScroll);
            }
        };

        requestAnimationFrame(animateScroll);
    },

    scrollTo: (bottom) => {
        if (bottom && ux.autoScrollCanceled) return;

        ui.chatContent.scrollTop = bottom ? ui.chatContent.scrollHeight : 0;
        ux.updateScrollButtons();
        ux.focusMessageInput();
    },

    updateScrollButtons: () => {
        const isScrolledToTop = ui.chatContent.scrollTop == 0;
        const isScrolledToBottom = ui.chatContent.scrollHeight - ui.chatContent.scrollTop <= ui.chatContent.clientHeight + 1;
        const isOverflowed = ui.chatContent.scrollHeight > ui.chatContent.clientHeight;

        dom.$(".scroll-button-top-area").forEach(button => {
            button.classList.toggle('visible', !isScrolledToTop);
            dom.show(button, isOverflowed);
        });

        dom.$(".scroll-button-bottom-area").forEach(button => {
            button.classList.toggle('visible', !isScrolledToBottom);
            dom.show(button, isOverflowed);
        });
    },

    scrollToNearest: (searchNext = true) => {
        const container = ui.chatContent;
        const containerTop = container.scrollTop;
        const allDivs = container.children;
        const className = 'assistant-message';
        let div = null;

        // Find first visible div
        let currentDivIndex = -1;
        Array.from(allDivs).forEach((child, i) => {
            if (child.classList.contains(className)) {
                const divTop = child.offsetTop;
                const divHeight = child.offsetHeight;
                const divBottom = divTop + divHeight;

                // Check if div is currently visible in viewport
                if ((divTop < containerTop) && (divBottom > containerTop)) {
                    currentDivIndex = searchNext ? i : i + 1;
                } else if (divTop >= containerTop && currentDivIndex === -1) {
                    currentDivIndex = i;
                }
            }
        });

        if (currentDivIndex === -1) return;

        // Find next/previous message based on search direction
        if (searchNext) {
            Array.from(allDivs).slice(currentDivIndex + 1).forEach((child) => {
                if (child.classList.contains(className) && !div) {
                    div = child
                }
            });
        } else {
            Array.from(allDivs).slice(0, currentDivIndex).reverse().forEach((child) => {
                if (child.classList.contains(className) && !div) {
                    div = child;
                }
            });
        }

        if (div) ux.smoothScroll(container, div.offsetTop - container.offsetTop);

        ux.focusMessageInput();
    },

    //#endregion

    //#region Mobile & Loading States

    toggleMobileMenu: (mode) => {
        document.getElementById('header-toggle-input').checked = mode;
    },

    setLoading: (isLoading, isGlobal = false) => {
        if (isLoading) {
            ux.toggleMobileMenu(false);
        }

        // Disable all controls except abort button during loading
        const selector = `body *:not(#abort-button, .scroll-button`;
        document.querySelectorAll(selector).forEach((element) => element.disabled = isLoading);

        // Update input placeholder to show loading state
        ui.messageInput.placeholder = ui.messageInput.getAttribute("data-placeholder-" + (isLoading ? "loading" : "default"));

        if (!isGlobal) {
            dom.show(ui.sendButton, !isLoading);
            dom.show(ui.abortButton, isLoading);
        }

        if (!isLoading) {
            ux.focusMessageInput();
        }
    },

    //#endregion

    //#region Api Key Management

    saveApiKey: async () => {
        const apikey = await ux.prompt(ui.providerSelect.options[ui.providerSelect.selectedIndex].text, `Enter your api key:`, settings.apiKey.get());

        if (apikey !== null) {
            settings.apiKey.set(apikey);
        }
        ux.focusMessageInput();
    },

    //#endregion

    //#region Dialogs

    prompt: async (title, message, defaultValue = '') => {
        return dom.isMobile()
            ? prompt(title, message, defaultValue)
            : dialog.prompt({
                title: title,
                message: message,
                defaultValue: defaultValue,
                okText: 'Save',
                cancelText: 'Cancel'
            });
    },

    alert: async (message) => {
        return dom.isMobile()
            ? alert(message)
            : dialog.alert({ title, message, okText: 'OK' });

    },

    //#endregion
};
