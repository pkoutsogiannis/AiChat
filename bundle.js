const fs = require('fs').promises;
const { exec } = require('child_process');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

const sourceDir = process.argv[2] || 'modules';
const bundleFile = 'app.js';
const minFile = 'app.min.js';

function isCommandNotFoundError(error) {
    // Different OS error indicators:
    // - code 1 or 127 (common Unix)
    // - ENOENT (Node.js)
    // - 'not recognized' (Windows)
    // - 'command not found' (Unix)
    return error.code === 1 ||
        error.code === 127 ||
        error.code === 'ENOENT' ||
        error.message.includes('not recognized') ||
        error.message.includes('command not found');
}

async function processFiles() {
    try {
        // Check if source directory exists
        try {
            await fs.access(sourceDir);
        } catch {
            console.error(`Source directory does not exist: ${sourceDir}`);
            process.exit(1);
        }

        // Clear or create bundle file
        await fs.writeFile(bundleFile, '');

        // Process each JS file
        const files = await fs.readdir(sourceDir);
        for (const file of files) {
            if (file.endsWith('.js') && file !== 'bundle.js') {
                // Read file content
                const content = await fs.readFile(path.join(sourceDir, file), 'utf8');

                // Remove import statements and empty lines
                const processedContent = content
                    .replace(/import\s+.*?from\s+['"].*?['"];?\r?\n?/gs, '')
                    .replace(/^\s*\r?\n/gm, '');

                // Prepare module content
                const moduleContent = `// Module: ${file}\n${processedContent}`;

                // Append to bundle file
                await fs.appendFile(bundleFile, moduleContent);
            }
        }

        // Get original size
        const stats = await fs.stat(bundleFile);
        const originalSize = stats.size / 1024;
        console.log(`${bundleFile} = ${originalSize.toFixed(2)}KB`);

        // Try to run terser
        const terserCommand = [
            'terser',
            bundleFile,
            '--module',
            '--compress',
            'dead_code=true,drop_debugger=true,keep_classnames=false,keep_fnames=false,unsafe=true,unsafe_methods=true',
            '--mangle',
            'keep_classnames=false,keep_fnames=false',
            '--source-map',
            `url=${bundleFile}`,
            '-o',
            minFile
        ].join(' ');

        try {
            await execAsync(terserCommand);

            // Get minified size and calculate savings
            const minStats = await fs.stat(minFile);
            const minifiedSize = minStats.size / 1024;
            const savings = (1 - minifiedSize / originalSize) * 100;

            console.log(`${minFile} = ${minifiedSize.toFixed(2)}KB (${savings.toFixed(1)}%)`);
        } catch (error) {
            if (isCommandNotFoundError(error)) {
                console.warn('To further minify, install terser with: npm install -g terser');
            } else {
                console.error(`Minification error: ${error.message}`);
            }
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

processFiles();