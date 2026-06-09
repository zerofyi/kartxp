import { Link } from '@inertiajs/react';
import {
    BarChart3,
    Bell,
    Building2,
    Image,
    LayoutGrid,
    Package,
    ScrollText,
    Settings,
    Shield,
    ShoppingBag,
    Tag,
    Users,
} from 'lucide-react';

import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';

import AppLogo from './app-logo';

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';

function NavItemLink({ item }: { item: NavItem & { children?: NavItem[] } }) {
    if (item.children && item.children.length > 0) {
        return (
            <SidebarMenuItem>
                <Collapsible defaultOpen={false} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {item.children.map((child) => (
                                <SidebarMenuSubItem key={child.title}>
                                    <SidebarMenuSubButton asChild>
                                        <Link href={child.href}>
                                            <span>{child.title}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarMenuItem>
        );
    }

    return (
        <SidebarMenuItem>
            <SidebarMenuButton tooltip={item.title} asChild>
                <Link href={item.href}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

const mainNavItems = [
    {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutGrid,
    },
];

const ecommerceNavItems = [
    {
        title: 'Orders',
        href: '/admin/orders',
        icon: ShoppingBag,
    },
    {
        title: 'Coupons',
        href: '/admin/coupons',
        icon: Tag,
    },
    {
        title: 'Banners',
        href: '/admin/banners',
        icon: Image,
    },
];

const catalogNavItems = [
    {
        title: 'Catalog',
        href: '/admin/catalog/categories',
        icon: Package,
        children: [
            { title: 'Categories', href: '/admin/catalog/categories' },
            { title: 'Brands', href: '/admin/catalog/brands' },
            { title: 'Tax Categories', href: '/admin/catalog/tax-categories' },
            { title: 'Units', href: '/admin/catalog/units' },
        ],
    },
];

const reportNavItems = [
    {
        title: 'Reports',
        href: '/admin/reports',
        icon: BarChart3,
        children: [
            { title: 'Sales Report', href: '/admin/reports/sales' },
            { title: 'Revenue Report', href: '/admin/reports/revenue' },
            { title: 'Inventory Report', href: '/admin/reports/inventory' },
            { title: 'Customer Report', href: '/admin/reports/customers' },
        ],
    },
];

const systemNavItems = [
    {
        title: 'Users',
        href: '/admin/users',
        icon: Users,
    },
    {
        title: 'Warehouses',
        href: '/admin/warehouses',
        icon: Building2,
    },
    {
        title: 'Roles & Permissions',
        href: '/admin/roles',
        icon: Shield,
    },
    {
        title: 'Notifications',
        href: '/admin/notifications',
        icon: Bell,
    },
    {
        title: 'Activity Log',
        href: '/admin/activity-log',
        icon: ScrollText,
    },
    {
        title: 'Settings',
        href: '/admin/settings',
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
                            <Link href="/admin">
                                <AppLogo />
                                <span className="text-xs font-semibold text-muted-foreground">
                                    Admin Panel
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* Main */}

                <SidebarMenu>
                    {mainNavItems.map((item) => (
                        <NavItemLink key={item.title} item={item} />
                    ))}
                </SidebarMenu>

                {/* Ecommerce */}

                <SidebarGroupLabel>Ecommerce</SidebarGroupLabel>
                <SidebarMenu>
                    {ecommerceNavItems.map((item) => (
                        <NavItemLink key={item.title} item={item} />
                    ))}
                </SidebarMenu>

                {/* Catalog */}

                <SidebarGroupLabel>Catalog</SidebarGroupLabel>
                <SidebarMenu>
                    {catalogNavItems.map((item) => (
                        <NavItemLink key={item.title} item={item} />
                    ))}
                </SidebarMenu>

                {/* Reports */}

                <SidebarGroupLabel>Analytics</SidebarGroupLabel>
                <SidebarMenu>
                    {reportNavItems.map((item) => (
                        <NavItemLink key={item.title} item={item} />
                    ))}
                </SidebarMenu>

                {/* System */}

                <SidebarGroupLabel>System</SidebarGroupLabel>
                <SidebarMenu>
                    {systemNavItems.map((item) => (
                        <NavItemLink key={item.title} item={item} />
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
