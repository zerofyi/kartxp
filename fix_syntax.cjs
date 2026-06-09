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
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix cases where ] was removed before .map or ?.map
    // e.g., 3.map( -> 3]?.map(
    // e.g., length: 32 }.map( -> length: 32 })?.map(
    // e.g., 'Health'.map( -> 'Health']?.map(
    
    // We will find instances of .map or ?.map that look like syntax errors and fix them.
    // Instead of regex, I will just do a global replace for the specific known broken signatures.
    
    let original = content;
    
    // Fixes based on known arrays in dummy files
    content = content.replace(/\[1, 2, 3(?:\?|\.)\.map/g, '[1, 2, 3]?.map');
    content = content.replace(/'Health'(?:\?|\.)\.map/g, "'Health']?.map");
    content = content.replace(/\{ length: 32 \}(?:\?|\.)\.map/g, "{ length: 32 })?.map");
    
    // Also, anything that was `word?.map(` where `word` lost its bracket. 
    // Actually, earlier the script replaced `].map` with `.map`? Let's check `find_maps.log` from earlier.
    
    // Let's do a more robust fix for anything that ends in a literal and `.map`
    content = content.replace(/(\d)(?:\?|\.)\.map\(/g, '$1]?.map('); // 3.map -> 3]?.map
    content = content.replace(/('Health')(?:\?|\.)\.map\(/g, "$1]?.map("); // 'Health'.map -> 'Health']?.map
    content = content.replace(/(\})(?:\?|\.)\.map\(/g, "$1)?.map("); // }.map -> })?.map (for Array.from)
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
        console.log('Fixed syntax in ' + file);
    }
});

console.log('Fixed ' + count + ' files.');
