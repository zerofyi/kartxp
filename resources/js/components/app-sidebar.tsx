import { Link } from '@inertiajs/react';
import { Barcode, BarcodeIcon, BookOpen, BrainCog, ContactRound, Folder, FolderTree, LayoutGrid, PackageSearch, ScanBarcode, Shapes, ShoppingCart, UserSearch } from 'lucide-react';

import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { soon, dashboard, } from '@/routes';
import { type NavItem } from '@/types';

import AppLogo from './app-logo';
import categories from '@/routes/categories';
import brands from '@/routes/brands';
import products from '@/routes/products';
import vendors from '@/routes/vendors';
import purchases from '@/routes/purchases';
import inventory from '@/routes/inventory';
import sales from '@/routes/sales';
import pos from '@/routes/pos';
import warehouse from '@/routes/warehouse';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: warehouse.dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Categories',
        href: categories.index(),
        icon: FolderTree,
    },
    {
        title: 'Brands',
        href: brands.index(),
        icon: Shapes,
    },
    {
        title: 'Products',
        href: products.index(),
        icon: PackageSearch,
    },
    {
        title: 'Vendors',
        href: vendors.index(),
        icon: ContactRound,
    },
    {
        title: 'Inventory',
        href: inventory.index(),
        icon: PackageSearch,
    },
    {
        title: 'Customers',
        href: '/',
        icon: UserSearch,
    },
    {
        title: 'Purchase',
        href: purchases.index(),
        icon: ShoppingCart,
    },
    {
        title: 'Add Sale',
        href: pos.index(),
        icon: ScanBarcode,
    },
    {
        title: 'Sales Report',
        href: sales.index(),
        icon: ScanBarcode,
    },
];

const footerNavItems: NavItem[] = [
    // {
    //     title: 'Repository',
    //     href: 'https://github.com/laravel/react-starter-kit',
    //     icon: Folder,
    // },
    // {
    //     title: 'Documentation',
    //     href: 'https://laravel.com/docs/starter-kits#react',
    //     icon: BookOpen,
    // },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={warehouse.dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
