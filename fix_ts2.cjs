const fs = require('fs');
const path = require('path');

const replacements = {
    'log': 'logs',
    'attempt': 'attempts',
    'statusLog': 'statusLogs',
    'status_log': 'status_logs',
    'barcode': 'barcodes',
    'value': 'values'
};

const arrayMethods = ['map', 'filter', 'reduce', 'forEach', 'some', 'every', 'find', 'findIndex', 'includes', 'flatMap', 'sort'];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('resources/js');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    for (const [bad, good] of Object.entries(replacements)) {
        for (const method of arrayMethods) {
            const regex = new RegExp(`\\b${bad}\\.${method}\\b`, 'g');
            content = content.replace(regex, `${good}.${method}`);
            
            const regexOpt = new RegExp(`\\b${bad}\\?\\.${method}\\b`, 'g');
            content = content.replace(regexOpt, `${good}?.${method}`);
        }
        const regexLen = new RegExp(`\\b${bad}\\.length\\b`, 'g');
        content = content.replace(regexLen, `${good}.length`);
        const regexLenOpt = new RegExp(`\\b${bad}\\?\\.length\\b`, 'g');
        content = content.replace(regexLenOpt, `${good}?.length`);
    }

    // Fix the `RefreshCw` which is an icon, not an array method.
    content = content.replace(/\bRefreshCw\b/g, 'RefreshCcw');

    // Fix the overzealous `labels.includes` back to `label.includes` inside Products.tsx
    if (file.includes('Products.tsx')) {
        content = content.replace(/\.labels\.includes/g, '.label.includes');
    }

    // Admin/ActivityLog/Index.tsx `events.map`?
    // resources/js/pages/Admin/ActivityLog/Index.tsx(111,44): error TS2339: Property 'map' does not exist on type 'string'.
    // If something became a string, maybe it was `JSON.parse(e.properties).map`? 
    // We will just leave that for manual inspection.

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
    }
});
