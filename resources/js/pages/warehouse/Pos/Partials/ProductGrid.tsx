import React, { useMemo } from 'react';
import { Filter, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/special/scroll-area';
import ProductCard from './ProductCard';
import { Product } from '../Index';

interface ProductGridProps {
    products: Product[];
    selectedCategory: string;
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    showFilter: boolean;
    setShowFilter: (v: boolean | ((p: boolean) => boolean)) => void;
    priceFilter: { min: string; max: string };
    setPriceFilter: React.Dispatch<React.SetStateAction<{ min: string; max: string }>>;
    stockFilter: string;
    setStockFilter: (v: string) => void;
    saleType: string;
    addToCart: (p: Product) => void;
}

const ProductGrid = ({
    products, selectedCategory,
    searchQuery, setSearchQuery,
    showFilter, setShowFilter,
    priceFilter, setPriceFilter,
    stockFilter, setStockFilter,
    saleType, addToCart,
}: ProductGridProps) => {

    const isSearching = searchQuery.trim().length > 0;

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

            if (isSearching) {
                const q = searchQuery.toLowerCase();
                // When searching, bypass stock filter so out-of-stock items are visible
                if (!p.name.toLowerCase().includes(q) && !p.barcode?.includes(searchQuery) && !p.sku.includes(searchQuery)) return false;
                // Don't apply stock filter when user is actively searching
                return true;
            }

            // Price filter always applies
            const price = saleType === 'retail' ? p.selling_price : p.min_selling_price;
            if (priceFilter.min && price < Number(priceFilter.min)) return false;
            if (priceFilter.max && price > Number(priceFilter.max)) return false;

            // Stock filter only applies when NOT searching
            if (stockFilter === 'instock'    && p.qty <= 0)               return false;
            if (stockFilter === 'lowstock'   && (p.qty <= 0 || p.qty > 10)) return false;
            if (stockFilter === 'outofstock' && p.qty > 0)                return false;

            return true;
        });
    }, [products, selectedCategory, searchQuery, isSearching, saleType, priceFilter, stockFilter]);

    return (
        <>
            {/* Toolbar */}
            <div className="border-b border-border bg-card p-4">
                <div className="flex gap-2 mb-2">
                    <Input
                        id="search-input"
                        placeholder="Search products... (F3)"
                        className="w-full"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <Select value={stockFilter} onValueChange={setStockFilter}>
                        <SelectTrigger className="bg-card"><SelectValue placeholder="Stock status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stock</SelectItem>
                            <SelectItem value="instock">In Stock</SelectItem>
                            <SelectItem value="lowstock">Low Stock (≤10)</SelectItem>
                            <SelectItem value="outofstock">Out of Stock</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        className={`${showFilter ? 'bg-emerald-700 text-white' : 'bg-muted text-muted-foreground'} hover:bg-emerald-700 hover:text-white border border-input shadow-sm`}
                        onClick={() => setShowFilter(v => !v)}
                        title="Toggle filters"
                    >
                        <Filter />
                    </Button>
                </div>

                {showFilter && (
                    <div className="grid grid-cols-3 gap-2 mt-2 p-3 bg-muted/50 rounded-md border border-border animate-in slide-in-from-top duration-200">
                        <div className="flex gap-2">
                            <Input type="number" placeholder="Min price" value={priceFilter.min} onChange={e => setPriceFilter(p => ({ ...p, min: e.target.value }))} className="text-sm bg-card" />
                            <Input type="number" placeholder="Max price" value={priceFilter.max} onChange={e => setPriceFilter(p => ({ ...p, max: e.target.value }))} className="text-sm bg-card" />
                        </div>
                        <Button
                            variant="outline"
                            className="text-sm bg-card"
                            onClick={() => { setPriceFilter({ min: '', max: '' }); setStockFilter('instock'); }}
                        >
                            Clear Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Product grid */}
            <ScrollArea className="flex-1">
                <div className="p-4">
                    {filteredProducts.length === 0 ? (
                        <div className="flex h-64 items-center justify-center text-muted-foreground">
                            No products found
                        </div>
                    ) : (
                        <div className="grid grid-cols-6 gap-2">
                            {filteredProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    saleType={saleType}
                                    onClick={addToCart}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </>
    );
};

export default React.memo(ProductGrid);
