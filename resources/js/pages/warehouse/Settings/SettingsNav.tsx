import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Building2, Truck, Settings } from 'lucide-react';

type NavTabs = 'profile' | 'shipping' | 'general';

type Props = {
    activeTab: NavTabs;
};

export default function SettingsNav({ activeTab }: Props) {
    return (
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/60 rounded-xl border">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.visit('/warehouse/settings/profile')}
                className={`text-xs ${activeTab === 'profile' ? 'bg-background shadow-sm font-semibold' : ''}`}
            >
                <Building2 className="h-3.5 w-3.5 mr-1.5" /> Business Profile
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.visit('/warehouse/settings/shipping-zones')}
                className={`text-xs ${activeTab === 'shipping' ? 'bg-background shadow-sm font-semibold' : ''}`}
            >
                <Truck className="h-3.5 w-3.5 mr-1.5" /> Shipping Zones
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.visit('/warehouse/settings')}
                className={`text-xs ${activeTab === 'general' ? 'bg-background shadow-sm font-semibold' : ''}`}
            >
                <Settings className="h-3.5 w-3.5 mr-1.5" /> General Settings
            </Button>
        </div>
    );
}
