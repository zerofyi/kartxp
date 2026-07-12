import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/special/scroll-area';
import { Category } from '../Index';

interface CategorySidebarProps {
    categories: Category[];
    selectedCategory: string;
    setSelectedCategory: (id: string) => void;
}

const CategorySidebar = ({
    categories,
    selectedCategory,
    setSelectedCategory,
}: CategorySidebarProps) => (
    <div className="flex w-[10%] flex-col border-r border-border bg-muted/30">
        <ScrollArea className="h-full w-full">
            <div className="space-y-2 p-1.5">
                {categories.map(cat => (
                    <Button
                        key={cat.id}
                        variant={selectedCategory === cat.id ? 'default' : 'outline'}
                        className={`flex h-auto w-full flex-col items-center justify-center px-1 py-2 text-xs shadow-sm transition-all
                            ${selectedCategory === cat.id
                                ? 'scale-102 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0 shadow-md'
                                : 'border border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}
                        onClick={() => setSelectedCategory(cat.id)}
                    >
                        <span className="w-full text-center text-[10px] sm:text-xs font-semibold leading-tight break-words whitespace-normal">
                            {cat.name}
                        </span>
                    </Button>
                ))}
            </div>
        </ScrollArea>
    </div>
);

export default React.memo(CategorySidebar);
