import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import LazyImage from './LazyImage';
import { Product } from '../Index';

interface ProductCardProps {
    product: Product;
    saleType: string;
    onClick: (p: Product) => void;
}

const ProductCard = ({ product, saleType, onClick }: ProductCardProps) => {
    const isOutOfStock  = product.qty <= 0;
    const displayPrice  = saleType === 'retail' ? product.selling_price : product.min_selling_price;

    return (
        <Card
            className={`group relative cursor-pointer overflow-hidden border py-0 transition-all active:scale-95
                ${isOutOfStock
                    ? 'border-destructive bg-destructive/5 text-destructive-foreground'
                    : 'border-input bg-card hover:border-emerald-500 hover:shadow-md'
                }`}
            onClick={() => !isOutOfStock && onClick(product)}
        >
            <div className="flex h-full flex-col p-2">
                {/* Stock badge */}
                <Badge
                    variant={isOutOfStock ? 'destructive' : product.qty > 10 ? 'default' : 'destructive'}
                    className={`${!isOutOfStock && product.qty > 10
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        : ''} absolute top-2 right-2 z-10`}
                >
                    {isOutOfStock ? 'OUT' : product.qty}
                </Badge>

                {/* Product image – lazy loaded via IntersectionObserver */}
                <LazyImage
                    src={product.img}
                    alt={product.name}
                    className="mt-1 mb-3 h-28 w-full"
                    imgClassName="transition-transform group-hover:scale-105"
                />

                {/* Product name */}
                <div className="mb-1 line-clamp-2 h-8 text-left text-xs leading-tight text-foreground/90">
                    {product.name}
                </div>

                {/* Price pill */}
                <div className={`rounded-md py-1 text-center text-sm font-bold shadow-md border-0 text-white
                    ${isOutOfStock
                        ? 'bg-destructive/60 line-through'
                        : 'bg-gradient-to-r from-emerald-600 to-emerald-700'
                    }`}
                >
                    ₹{displayPrice.toFixed(2)}
                </div>
            </div>
        </Card>
    );
};

export default React.memo(ProductCard);
