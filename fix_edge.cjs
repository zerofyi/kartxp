const fs = require('fs');

function replaceFile(path, bad, good) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(bad, good);
    fs.writeFileSync(path, content, 'utf8');
}

// Fix Pos.tsx
replaceFile('resources/js/pages/Warehouse/Pos.tsx', /p\.barcodes\.includes/g, 'p.barcode?.includes');

// Fix Pos copy.tsx
replaceFile('resources/js/pages/Pos copy.tsx', /p\.barcodes\.includes/g, 'p.barcode?.includes');

// Fix salesDummy.tsx
replaceFile('resources/js/pages/salesDummy.tsx', /p\.barcodes\.includes/g, 'p.barcode?.includes');

// Fix wayfinder
replaceFile('resources/js/wayfinder/index.ts', /values\.map/g, 'value.map');
replaceFile('resources/js/wayfinder/index.ts', /values\?\.map/g, 'value?.map');

// Fix RefreshCcw in OnlineOrders/Show.tsx
replaceFile('resources/js/pages/Warehouse/OnlineOrders/Show.tsx', /RefreshCcw/g, 'RefreshCw');
