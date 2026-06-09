const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('resources/js/pages');
let issues = [];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        // Find .map or .filter without preceding ? or ?? []
        // We look for variables like `props.items.map(` or `data.map(`
        // This is heuristic but helpful
        if (line.match(/\w+\.map\s*\(/) && !line.match(/\?\./) && !line.match(/\?\?\s*\[\]/)) {
            // Further refinement: check if it's an array literal or something safe
            if (!line.match(/\[.*\]\.map/) && !line.match(/Object\./) && !line.match(/Array\./)) {
                issues.push(`Unprotected map in ${file}:${index + 1} -> ${line.trim()}`);
            }
        }
        
        // Find .filter
        if (line.match(/\w+\.filter\s*\(/) && !line.match(/\?\./) && !line.match(/\?\?\s*\[\]/)) {
            if (!line.match(/\[.*\]\.filter/) && !line.match(/Object\./) && !line.match(/Array\./)) {
                issues.push(`Unprotected filter in ${file}:${index + 1} -> ${line.trim()}`);
            }
        }
    });
});

if (issues.length > 0) {
    console.log(issues.join('\n'));
} else {
    console.log("No unprotected maps found.");
}
