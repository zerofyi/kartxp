const fs = require('fs');
const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) results = results.concat(walk(file));
        else if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    });
    return results;
};

let count = 0;
walk('resources/js/pages').forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace incorrectly modified syntax
    content = content.replace(/(\d)\.map\(/g, '$1]?.map(');
    content = content.replace(/('Health')\.map\(/g, "$1]?.map(");
    content = content.replace(/(\})\.map\(/g, "$1)?.map(");
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
        console.log('Fixed ' + file);
    }
});
console.log('Fixed ' + count + ' files.');
