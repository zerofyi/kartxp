const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\zerof\\.gemini\\antigravity\\brain\\4e188fb5-736f-4390-a06f-4869256e4735\\.system_generated\\tasks\\task-1621.log', 'utf8').split('\n');
const files = {};
lines.forEach(l => {
    if (l.includes('error TS')) {
        const f = l.split('(')[0].trim();
        files[f] = (files[f] || 0) + 1;
    }
});
Object.entries(files)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`${v} - ${k}`));
