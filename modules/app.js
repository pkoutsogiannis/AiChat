/*
 * Copyright 2025 Periklis Koutsogiannis
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 * 
 * Module: app
 * Description: Application initialization and configuration manager.
 */

import { settings } from './settings.js';
import { api } from './api.js';
import { ux } from './ux.js';
import { ui, uiBindEvents } from './ui.js';

export const app = async (config) => {

    ux.setLoading(true, true);
    try {
        // Fetch configuration data
        const data = await api.makeRequest({
            url: api.buildUrl({
                action: 'config',
            })
        });

        // Check if the fetched data contains a valid configuration object
        if (!data.config) throw new Error('Invalid configuration data');

        // Update settings.config with configuration data from parameters and fetched data.
        // Settings.config is the main configuration object used throughout the app.
        settings.config = { ...settings.config, ...config, ...data.config };

        // Bind events to all UI elements 
        uiBindEvents();

        // Create a custom populate event
        const event = new CustomEvent('populate');

        // Dispatch the custom event to populate the providers select element
        // that will trigger a provider change event and subsequently the model change 
        // and then the history fetch (see ui.js)
        ui.providerSelect.dispatchEvent(event);

        // Dispatch the custom event to populate the theme select element
        // that will trigger a theme change event which will apply the selected theme (see ui.js)
        ui.themeSelect.dispatchEvent(event);

    } catch (error) {
        ux.handleError(`[config] ${error}`);
    } finally {
        ux.setLoading(false, true);
    }

    // Done.
}
