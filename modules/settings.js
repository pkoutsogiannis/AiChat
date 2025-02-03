/*
 * Copyright 2025 Periklis Koutsogiannis
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 * 
 * Module: settings
 * Description: Application settings and configuration management system.
 */

export const settings = {
    config: {
        endpoint: 'api.php',
        debounceTimeout: 30, // Prevent too many UI updates during streaming - debounce every 30ms
        onContentReady: null,
        onDivReady: null,
        providers: null,
        themes: null,
        toggles: null,
    },

    get: (key, defValue) => {
        const value = localStorage.getItem(key) ?? defValue;
        if (value === 'true' || value === 'false') return value === 'true';
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    },

    set: (key, value) => {
        localStorage.setItem(key, value);
    },

    toggle: {
        get: (name, defValue) => settings.get(`toggle_${name}`, defValue) === true,
        set: (name, value) => settings.set(`toggle_${name}`, value)
    },

    apiKey: {
        get: () => settings.get(`apikey_${settings.provider.get()}`, ''),
        set: (apiKey) => settings.set(`apikey_${settings.provider.get()}`, apiKey),
    },

    provider: {
        get: (defValue) => settings.get('provider', defValue),
        set: (provider) => settings.set('provider', provider)
    },

    model: {
        get: (provider, defValue) => settings.get(`model_${provider}`, defValue),
        set: (provider, model) => settings.set(`model_${provider}`, model)
    },

    theme: {
        get: (defValue) => settings.get('theme', defValue),
        set: (theme) => settings.set('theme', theme)
    }
};
