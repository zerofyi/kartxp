import { Link } from '@inertiajs/react';
import {
    LayoutGrid,
    FolderTree,
    Shapes,
    PackageSearch,
    ContactRound,
    Archive,
    ShoppingCart,
    ScanBarcode,
    ReceiptText,
    Barcode,
    ClipboardList,
    ShoppingBag,
    RefreshCcw,
    UserSearch,
    Wallet,
    Users,
    Settings,
} from 'lucide-react';

import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import AppLogo from './app-logo';
import { ScrollArea } from '@/components/special/scroll-area';
import warehouse from '@/routes/warehouse';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: warehouse.dashboard().url,
        icon: LayoutGrid,
    },
    {
        title: 'Categories',
        href: warehouse.categories.index().url,
        icon: FolderTree,
    },
    {
        title: 'Brands',
        href: warehouse.brands.index().url,
        icon: Shapes,
    },
    {
        title: 'Products',
        href: warehouse.products.index().url,
        icon: PackageSearch,
    },
    {
        title: 'Vendors',
        href: warehouse.vendors.index().url,
        icon: ContactRound,
    },
];

const inventoryNavItems: NavItem[] = [
    {
        title: 'Stock Levels',
        href: warehouse.inventory.index().url,
        icon: Archive,
    },
    {
        title: 'Purchases',
        href: warehouse.purchases.index().url,
        icon: ShoppingCart,
    },
    {
        title: 'Barcodes',
        href: '#',
        //href: warehouse.barcodesV2.index().url,
        icon: Barcode,
    },
    {
        title: 'Reports & Ledger',
        href: warehouse.analyticsEngine.dashboard().url,
        icon: ClipboardList,
    },
];

const salesNavItems: NavItem[] = [
    {
        title: 'POS / New Sale',
        href: warehouse.pos.index().url,
        icon: ScanBarcode,
    },
    {
        title: 'Sales History',
        href: warehouse.sales.index().url,
        icon: ReceiptText,
    },
    {
        title: 'M-Card Sales',
        href: warehouse.sales.mcard().url,
        icon: ReceiptText,
    },
];

const ecommerceNavItems: NavItem[] = [
    {
        title: 'Online Orders',
        href: warehouse.onlineOrders.index().url,
        icon: ShoppingBag,
    },
    {
        title: 'Returns',
        href: warehouse.returns.index().url,
        icon: RefreshCcw,
    },
    {
        title: 'Customers',
        href: warehouse.customers.index().url,
        icon: UserSearch,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Accounting',
        href: warehouse.accounting.journal().url,
        icon: Wallet,
    },
    {
        title: 'Staff',
        href: warehouse.staff.index().url,
        icon: Users,
    },
    {
        title: 'Settings',
        href: warehouse.settings.index().url,
        icon: Settings,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={warehouse.dashboard().url} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <ScrollArea>
                <SidebarContent>
                    {/* Catalogue */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Catalogue</SidebarGroupLabel>
                        <NavMain items={mainNavItems} />
                    </SidebarGroup>

                    {/* Inventory */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Inventory</SidebarGroupLabel>
                        <NavMain items={inventoryNavItems} />
                    </SidebarGroup>

                    {/* Sales */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Sales</SidebarGroupLabel>
                        <NavMain items={salesNavItems} />
                    </SidebarGroup>

                    {/* Ecommerce */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Ecommerce</SidebarGroupLabel>
                        <NavMain items={ecommerceNavItems} />
                    </SidebarGroup>

                    {/* Management */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Management</SidebarGroupLabel>
                        <NavMain items={adminNavItems} />
                    </SidebarGroup>
                </SidebarContent>
            </ScrollArea>

            <SidebarFooter>
                <NavFooter items={[]} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
