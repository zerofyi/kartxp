import { Head, useForm, router } from '@inertiajs/react';
import { Plus, Shield, Save, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import AdminAppLayout from '@/layouts/admin-app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Roles & Permissions', href: '/admin/roles' }];

type Role = {
    id: number;
    name: string;
    permissions_count: number;
    permissions: string[];
};

type Props = {
    roles: Role[];
    permissions: Record<string, string[]>;
    all_permissions: Array<{ id: number; name: string }>;
};

export default function RolesIndex({ roles, permissions, all_permissions }: Props) {
    const [selectedRole, setSelectedRole] = useState(roles[0]?.name ?? '');
    const [saving, setSaving] = useState(false);
    const [savedRole, setSavedRole] = useState<string | null>(null);
    const [rolePerms, setRolePerms] = useState<Record<string, string[]>>(
        Object.fromEntries(roles.map((r) => [r.name, r.permissions]))
    );

    const togglePermission = (roleName: string, perm: string) => {
        setRolePerms((prev) => {
            const current = prev[roleName] ?? [];
            if (current.includes(perm)) {
                return { ...prev, [roleName]: current.filter((p) => p !== perm) };
            }
            return { ...prev, [roleName]: [...current, perm] };
        });
    };

    const saveRole = (role: Role) => {
        setSaving(true);
        router.put(`/admin/roles/${role.id}`, { permissions: rolePerms[role.name] }, {
            onFinish: () => {
                setSaving(false);
                setSavedRole(role.name);
                setTimeout(() => setSavedRole(null), 2000);
            },
            preserveState: true,
        });
    };

    const currentRole = roles.find((r) => r.name === selectedRole);

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles & Permissions — Admin" />
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
                        <p className="text-muted-foreground">Manage access control for each role</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {/* Role List */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm">Roles</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-1">
                            {roles.map((role) => (
                                <button
                                    key={role.name}
                                    onClick={() => setSelectedRole(role.name)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedRole === role.name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium capitalize">{role.name.replace('_', ' ')}</span>
                                        <span className={`text-xs ${selectedRole === role.name ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                            {(rolePerms[role.name] ?? []).length}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Permissions Matrix */}
                    {currentRole && (
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="capitalize">{currentRole.name.replace('_', ' ')} Permissions</CardTitle>
                                        <CardDescription>{(rolePerms[currentRole.name] ?? []).length} permissions granted</CardDescription>
                                    </div>
                                    <Button onClick={() => saveRole(currentRole)} disabled={saving} size="sm">
                                        {savedRole === currentRole.name ? (
                                            <><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />Saved!</>
                                        ) : (
                                            <><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Permissions'}</>
                                        )}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {Object.entries(permissions).map(([module, perms]) => (
                                    <div key={module} className="mb-6">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 capitalize">
                                            {module.replace('-', ' ')}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {perms.map((perm) => {
                                                const hasIt = (rolePerms[currentRole.name] ?? []).includes(perm);
                                                return (
                                                    <div key={perm} className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`${currentRole.name}-${perm}`}
                                                            checked={hasIt}
                                                            onCheckedChange={() => togglePermission(currentRole.name, perm)}
                                                        />
                                                        <Label
                                                            htmlFor={`${currentRole.name}-${perm}`}
                                                            className="text-sm cursor-pointer select-none"
                                                        >
                                                            {perm.split('.').pop()?.replace('-', ' ')}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(permissions).length === 0 && (
                                    <div className="flex flex-col items-center py-12 text-muted-foreground">
                                        <Shield className="h-10 w-10 mb-3 opacity-40" />
                                        <p>No permissions defined yet</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AdminAppLayout>
    );
}
