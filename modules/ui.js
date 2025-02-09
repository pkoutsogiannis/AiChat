/*
 * Copyright 2025 Periklis Koutsogiannis
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 * 
 * Module: ui
 * Description: User interface element management and event binding system.
 */

import { settings } from './settings.js';
import { dom } from './dom.js';
import { api } from './api.js';
import { ux } from './ux.js';
import { upload } from './upload.js';
import { chat } from './chat.js';

export const ui = {

    // dom.$$ is a wrapper to dom.$ with attachHook=true
    //
    // It returns an element or an iterable list of elements based on CSS selectors
    // with a hook method for chaining event hooks later in the code. 
    // For more information, see the documentation in dom.js

    header: dom.$$('#header'),
    providerSelect: dom.$$('#provider-select'),
    modelSelect: dom.$$('#model-select'),
    themeSelect: dom.$$('#theme-select'),
    streamToggleButton: dom.$$('#stream-toggle-button'),
    darkModeToggleButton: dom.$$('#mode-toggle-button'),
    downloadButton: dom.$$('#download-button'),
    apikeyButton: dom.$$('#apikey-button'),
    resetButton: dom.$$('#reset-button'),
    chatContent: dom.$$('#chat-content'),
    footer: dom.$$('#footer'),
    inputWrapper: dom.$$('#input-wrapper'),
    filePreview: dom.$$('#file-preview'),
    messageInput: dom.$$('#message-input'),
    sessionInfoSpan: dom.$$('#session-info-span'),
    uploadButton: dom.$$('#upload-button'),
    sendButton: dom.$$('#send-button'),
    abortButton: dom.$$('#abort-button'),
    scrollTopButton: dom.$$('#scroll-button-top'),
    scrollBottomButton: dom.$$('#scroll-button-bottom'),
    previousMessageButton: dom.$$('#scroll-button-previous-message'),
    nextMessageButton: dom.$$('#scroll-button-next-message'),
    fileInput: dom.$$('#file-input'),
};

export const uiBindEvents = () => {

    //#region Toggle & Theme Setup

    for (let toggleName in settings.config.toggles) {
        settings.config.toggles[toggleName] = settings.toggle.get(toggleName, settings.config.toggles[toggleName]);
        ux.updateToggle(toggleName);
    }

    //#endregion

    //#region Provider & Model Setup

    ui.header.hook('click', (e) => {
        if (e.target === ui.header) ux.toggleMobileMenu();
    });

    // Populate is a custom event that triggers the population of a select element (see app.js)
    ui.providerSelect.hook('populate', (e) => {
        // Populate the providers select element
        // dispatching a change event to trigger the population of the models select element
        dom.populateSelect(ui.providerSelect, settings.config.providers, {
            getValue: ([key, value], index) => key,
            getText: ([key, value], index) => value.name,
            defValue: settings.provider.get(Object.keys(settings.config.providers)[0]),
        });
    }).hook('change', (e) => {
        const provider = e.target.value

        // Save the selected provider
        settings.provider.set(provider);

        // Get the selected provider's configuration
        const providerConfig = settings.config.providers[provider];

        // Show or hide the API key button based on the provider's API key requirement
        dom.show(ui.apikeyButton, !providerConfig.apikey);

        // Populate the models select element
        // and dispatching a change event to trigger a history fetch

        const getModelName = (model) => {
            // If the model is a string, convert it to lowercase
            // If the model is an array and the second element is an object, convert the first element to lowercase
            // Otherwise, convert the second element to lowercase
            return (typeof model === 'string'
                ? model
                : (typeof model[1] === 'object'
                    ? model[0]
                    : model[1])).toLowerCase();
        }

        dom.populateSelect(ui.modelSelect, providerConfig.models, {
            getValue: (item, index) => getModelName(item),
            getText: (item, index) => getModelName(item),
            defValue: settings.model.get(provider, getModelName(providerConfig.models[0])),
        });
    });

    ui.modelSelect.hook('change', (e) => {
        settings.model.set(ui.providerSelect.value, e.target.value);

        ux.resetUi();
        ux.setLoading(true, true);

        api.makeRequest({
            url: api.buildUrl({
                action: 'history'
            })
        }).then((data) => {
            data.history?.forEach((message) => chat.addMessage(message.prompt, message.role === 'user'));

            ux.updateInfo(data.info);
            ux.focusMessageInput();
        }).catch((error) => {
            ux.handleError(`[history] ${error}`);
        }).finally(() => {
            ux.setLoading(false);
        });
    });

    ui.themeSelect.hook('populate', (e) => {
        // Populate the themes select element 
        // dispatching a change event to apply the selected theme (see ui.js)
        dom.populateSelect(ui.themeSelect, settings.config.themes, {
            getValue: (theme) => theme,
            getText: (theme) => theme,
            defValue: settings.theme.get(settings.config.themes[0]),
        });
    }).hook('change', (e) => {
        ux.applyTheme(e.target.value);
        ux.focusMessageInput();
    });

    ui.streamToggleButton.hook('click', () => {
        ux.switchToggle('stream');
    });

    ui.darkModeToggleButton.hook('click', () => {
        ux.switchToggle('dark');
        ux.setBrowserColor();
    });

    //#endregion

    //#region Button Event Handlers

    ui.downloadButton.hook('click', () => {
        const a = document.createElement('a');
        a.href = api.buildUrl({ action: 'download' });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    ui.apikeyButton.hook('click', () => {
        ux.saveApiKey();
    });

    ui.resetButton.hook('click', () => {
        if (!confirm('Are you sure you want to reset the conversation?')) return;

        ux.resetUi();

        ux.setLoading(true, true);

        api.makeRequest({
            url: api.buildUrl({ action: 'reset' })
        }).then(() => {
            ux.resetUi();
        }).catch((error) => {
            ux.handleError(`Could not reset the conversation: ${error}`);
        }).finally(() => {
            ux.setLoading(false);
        });
    });

    footer.hook('click', (e) => {
        if (e.target === ui.footer) ux.focusMessageInput();
    });

    //#endregion

    //#region Chat Content & Input Handlers

    ui.chatContent.hook('scroll', (e) => {
        ux.autoScrollCanceled = e.target.scrollHeight - e.target.scrollTop > e.target.clientHeight + 1;
        ux.updateScrollButtons();
    }).hook('delegate:click:.code-head-clip', (e) => {
        //navigator.clipboard.writeText(e.target.nextElementSibling?.textContent);
        const text = e.target.parentNode.innerHTML.replace(e.target.innerHTML, '').trim();
        navigator.clipboard.writeText(text);
    }).hook('delegate:click:.user-message', (e) => {
        e.target.classList.add('expanded');
    });

    ui.inputWrapper.hook('click', () => {
        ux.focusMessageInput();
    });

    ui.messageInput.hook('keypress', (e) => {
        if (e.keyCode === 13 && !e.shiftKey) {
            e.preventDefault();
            chat.sendMessage();
        }
    }).hook('input', (e) => {
        ux.autofitText(e.target);
    }).hook('paste', (e) => {
        upload.addFiles(e.clipboardData.files);
    });

    ui.fileInput.hook('change', (e) => {
        upload.addFiles(e.target.files);
    });

    ui.uploadButton.hook('click', () => {
        ui.fileInput.click();
    });

    ui.sendButton.hook('click', () => {
        chat.sendMessage();
    });

    ui.abortButton.hook('click', () => {
        chat.abortRequest();
    });

    //#endregion

    //#region Scroll & Navigation Handlers

    ui.scrollTopButton.hook('click', () => {
        ux.autoScrollCanceled = false;
        ux.scrollTo(false);
    });

    ui.scrollBottomButton.hook('click', () => {
        ux.autoScrollCanceled = false;
        ux.scrollTo(true);
    });

    ui.previousMessageButton.hook('click', () => {
        ux.scrollToNearest(false);
    });

    ui.nextMessageButton.hook('click', () => {
        ux.scrollToNearest(true);
    });

    ux.setSwipeHandler(150, (distance) => {
        ux.toggleMobileMenu(distance > 0);
    });

    //#endregion

};
