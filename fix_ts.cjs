const fs = require('fs');
const path = require('path');

const replacements = {
    'MOCK_PRODUCT': 'MOCK_PRODUCTS',
    'MOCK_VENDOR': 'MOCK_VENDORS',
    'ROLE_OPTION': 'ROLE_OPTIONS',
    'STATUS_OPTION': 'STATUS_OPTIONS',
    'STATUS_STEP': 'STATUS_STEPS',
    'TAB': 'TABS',
    'addresse': 'addresses',
    'agent': 'agents',
    'allTab': 'allTabs',
    'allTabStatuse': 'allTabStatuses',
    'attribute': 'attributes',
    'available_statuse': 'available_statuses',
    'banner': 'banners',
    'batche': 'batches',
    'brand': 'brands',
    'categorie': 'categories',
    'categoryTre': 'categoryTree',
    'chart_dat': 'chart_data',
    'commonSetting': 'commonSettings',
    'compresse': 'compressed',
    'cop': 'copy',
    'customer': 'customers',
    'dat': 'data',
    'displayLis': 'displayList',
    'existingImage': 'existingImages',
    'expiringBatche': 'expiringBatches',
    'file': 'files',
    'filteredBrand': 'filteredBrands',
    'filteredCustomer': 'filteredCustomers',
    'filteredProduct': 'filteredProducts',
    'filteredPurchase': 'filteredPurchases',
    'heldInvoice': 'heldInvoices',
    'img': 'imgs',
    'inventor': 'inventory',
    'invoiceItem': 'invoiceItems',
    'item': 'items',
    'label': 'labels',
    'log_name': 'log_names',
    'low_stoc': 'low_stock',
    'newImage': 'newImages',
    'orders_to_pac': 'orders_to_pack',
    'payment': 'payments',
    'pre': 'prev',
    'product': 'products',
    'purchase': 'purchases',
    'purchaseItem': 'purchaseItems',
    'quickLink': 'quickLinks',
    'quickProduct': 'quickProducts',
    'recent_order': 'recent_orders',
    'reordere': 'reordered',
    'reportCard': 'reportCards',
    'row': 'rows',
    'searchResult': 'searchResults',
    'shipping_zone': 'shipping_zones',
    'sortedInventor': 'sortedInventory',
    'staf': 'staff',
    'statuse': 'statuses',
    'step': 'steps',
    'stockMovement': 'stockMovements',
    'suggestion': 'suggestions',
    'taxCategorie': 'taxCategories',
    'toProces': 'toProcess',
    'today_deliverie': 'today_deliveries',
    'top_mover': 'top_movers',
    'top_product': 'top_products',
    'unit': 'units',
    'variant': 'variants',
    'vendor': 'vendors',
    'vendorSummar': 'vendorSummary',
    'visibleExistin': 'visibleExisting',
    'warehouse': 'warehouses',
    'warehouseStock': 'warehouseStocks',
    'RefreshCw': 'RefreshCcw'
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
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    for (const [bad, good] of Object.entries(replacements)) {
        for (const method of arrayMethods) {
            // Replace `bad.method` with `good.method`
            // But also we need to handle cases where it is an object property: `sale.item.map` -> `sale.items.map`
            // So we can just replace `bad.` followed by `method`
            // Let's use a regex to ensure word boundary
            const regex = new RegExp(`\\b${bad}\\.${method}\\b`, 'g');
            content = content.replace(regex, `${good}.${method}`);
            
            // Also handle optional chaining like `bad?.method`
            const regexOpt = new RegExp(`\\b${bad}\\?\\.${method}\\b`, 'g');
            content = content.replace(regexOpt, `${good}?.${method}`);
        }
    }
    
    // Also, some properties like `product.dat` without array methods might have been reported because it's used elsewhere?
    // Wait, the automated script ONLY did this to `.map` and `.filter` according to the previous agent!
    // But what if it also did it to `.length`? Let's check `length`.
    for (const [bad, good] of Object.entries(replacements)) {
        const regexLen = new RegExp(`\\b${bad}\\.length\\b`, 'g');
        content = content.replace(regexLen, `${good}.length`);
        const regexLenOpt = new RegExp(`\\b${bad}\\?\\.length\\b`, 'g');
        content = content.replace(regexLenOpt, `${good}?.length`);
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedFiles++;
    }
});

console.log(`Fixed ${changedFiles} files.`);
