const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\zerof\\.gemini\\antigravity\\brain\\4e188fb5-736f-4390-a06f-4869256e4735\\.system_generated\\tasks\\task-1621.log', 'utf8').split('\n');
const missing = new Set();
lines.forEach(l => {
    const match = l.match(/Cannot find name '([^']+)'/);
    if (match) {
        missing.add(match[1]);
    }
});
console.log(Array.from(missing).sort().join(', '));
