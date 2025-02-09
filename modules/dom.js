/*
 * Copyright 2025 Periklis Koutsogiannis
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 * 
 * Module: dom
 * Description: Advanced DOM manipulation utility providing enhanced element selection and event handling.
 */

export const dom = {

    /**
     * dom.$(selector, attachHook=false)
     * 
     * Enhanced element selector using css selectors with chainable event handling capabilities and event delegation.
     * Returns a single element for unique selectors (like IDs) or a wrapper object with forEach and hook methods
     * for selectors that may match multiple elements.
     * 
     * @param {string} selector - Any valid CSS selector
     * @param {boolean} attachHook - Whether to attach the hook method for event handling (default: false)
     * @returns {Element|Object} Single element or wrapper object for multiple elements
     * 
     * Example usage with attachHook=false (default):
     * const element = dom.$('#my-element')                 // Returns raw element without hook method
     * const elements = dom.$('.my-elements')               // Returns an iterable list of elements without hook method
     * 
     * Example usage with attachHook=true (chainable hook method):
     * const button = dom.$('#my-button')
     *     .hook('click', () => console.log('clicked'))     // Returns this for chaining
     *     .hook('mouseover', () => console.log('hover'));  // Returns this for chaining
     * 
     * Example usage for multiple elements (chainable methods):
     * dom.$('.btn.primary', true)                          // attachHook needed for event handling
     *     .forEach(button => console.log(button))          // Returns this for chaining
     *     .hook('click', () => console.log('clicked'));    // Returns this for chaining
     * 
     * Example usage for delegated events on dynamic elements:
     * dom.$('#container', true)
     *     .hook('delegate:click:.dynamic-button', () => console.log('button clicked'))
     *     .hook('delegate:click:.dynamic-link', () => console.log('link clicked'))
     *     .hook('click', () => console.log('container ittarget clicked'));
     * 
     * Multiple delegated events on same container:
     * dom.$('#container', true)
     *     .hook('delegate:click:.dynamic-button', () => { })
     *     .hook('delegate:mouseover:.dynamic-button', () => { });
     */
    $: (selector, attachHook = false) => {

        const attachHookWithDelegate = (element) => {
            // Return early if element is invalid, already has hook, or attachHook is undefined
            if (!element || element.hook || !attachHook) {
                return element;
            }

            // Attach hook method to element
            element.hook = function (event, callback) {
                // Get array of elements (handle both single elements and collections)
                const elements = 'elements' in this ? this.elements : [this];

                // Determine event type and handler based on event string
                let type, handler;

                // Check if it's a delegate event (format: delegate:eventType:selector)
                if (event.startsWith('delegate:')) {
                    // Parse delegate event string
                    const [_, eventType, selector] = event.match(/delegate:([^:]+):(.+)/) || [];

                    // Validate delegate syntax
                    if (!eventType || !selector) {
                        throw new Error('Invalid delegate syntax. Use: delegate:eventType:selector');
                    }

                    type = eventType;
                    handler = (e) => {
                        // Only execute callback if target matches selector
                        const matchingElement = e.target.closest(selector);
                        if (matchingElement) {
                            // Create a new event with the correct target
                            callback.call(matchingElement, Object.create(e, {
                                target: { value: matchingElement },
                                target: { value: matchingElement }
                            }));
                        }
                    };
                } else {
                    // Regular event
                    type = event;
                    handler = callback;
                }

                // Attach event listener to all elements
                elements.forEach(el => el.addEventListener(type, handler));

                // Return element for chaining
                return this;
            };

            return element;
        };

        // If selector is already an element, just add hook method and return it
        if (selector instanceof HTMLElement) {
            return attachHookWithDelegate(selector);
        }

        // For backward compatibility, if selector is just an ID without #, add it
        if (0 && /^[A-Za-z][\w-]*$/.test(selector) && !selector.includes('.')) {
            selector = '#' + selector;
        }

        const elements = document.querySelectorAll(selector);

        if (elements.length === 0) {
            throw new Error(`No elements found for selector: ${selector}`);
        }

        // If selector matches exactly one element (like an ID), return it directly
        if (elements.length === 1) {
            return attachHookWithDelegate(elements[0]);
        }

        // Convert NodeList to an iterable list and attach hook method
        const elementsArray = Array.from(elements);
        elementsArray.forEach(attachHookWithDelegate);

        // Return wrapper object with forEach and hook methods
        return {
            elements: elementsArray,
            forEach(callback) {
                this.elements.forEach(callback);
                return this;
            },
            hook(event, callback) {
                this.forEach(element => element.hook(event, callback));
                return this;
            }
        };
    },

    /**
     * Wrapper for dom.$ that returns a chainable element object with event handling capabilities.
     */
    $$: (selector) => {
        return dom.$(selector, true);
    },

    create: (tag, id = null, className = null) => {
        const element = document.createElement(tag);
        element.id = id;
        element.className = className;
        return dom.$$(element);
    },

    // Wrapper for dom.create that returns a div element
    createDiv: (id = null, className = null) => {
        return dom.create('div', id, className);
    },

    populateSelect: (select, data, options = {}) => {
        const {
            getValue = (item) => item,
            getText = (item) => item,
            getDisabled = () => false,
            defValue = null,
        } = options;

        const items = Array.isArray(data) ? data : Object.entries(data);

        // Create all options at once using HTML string
        select.innerHTML = items.map((item, index) => `
            <option value="${getValue(item, index)}" 
                  ${getDisabled(item, index) ? 'disabled' : ''}>${getText(item, index)}
            </option>`
        ).join('');

        if (defValue !== null) {
            select.value = defValue;
            select.dispatchEvent(new Event('change'));
        }
    },

    // Utility functions for element manipulation

    show: (element, show) => {
        element.style.display = show ? '' : 'none';
    },

    isMobile: () => {
        return 'orientation' in window && (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
    },

    delegate: (sig, cb) => {
        dom.$$("body").hook(`delegate:${sig}`, cb)
    }
};
