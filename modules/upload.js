/*
 * Copyright 2025 Periklis Koutsogiannis
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 * 
 * Module: upload
 * Description: Upload management utility.
 */

import { dom } from './dom.js';
import { api } from './api.js';
import { ui } from './ui.js';

export const upload = {
    files: [],

    addFiles(newFiles, updatePreview = true) {
        this.files = [...this.files, ...Array.from(newFiles)];
        if (updatePreview) this.updatePreview();
    },

    removeFile(index) {
        this.files.splice(index, 1);
        this.updatePreview();
    },

    updatePreview(clear = false) {
        if (clear) upload.files = [];
        ui.filePreview.innerHTML = '';
        if (this.files.length > 0) {
            ui.filePreview.classList.add('has-files');
            this.files.forEach((file, i) => {
                const preview = dom.createDiv(null, 'file-preview-item');
                preview.setAttribute('data-index', i);
                preview.textContent = file.name;
                preview.onclick = () => this.removeFile(i);
                ui.filePreview.appendChild(preview);
            });
        } else {
            ui.filePreview.classList.remove('has-files');
        }
    },

    makeRequest: async () => {
        const formData = new FormData();
        for (let i = 0; i < upload.files.length; i++)
            formData.append('files[]', upload.files[i]);

        // Create progress overlay
        const progressOverlay = dom.createDiv('upload-progress');
        document.body.appendChild(progressOverlay);

        progressOverlay.classList.add('visible');
        progressOverlay.textContent = '0%';

        await api.makeRequest({
            method: 'POST',
            url: api.buildUrl({
                action: 'upload'
            }),
            data: formData,
            onProgress: (progress) => {
                progressOverlay.textContent = progress.percentComplete + '%';
            }
        }).finally(() => {
            progressOverlay.classList.remove('visible');
        });
    },
};