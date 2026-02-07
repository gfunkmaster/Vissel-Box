import { getCurrentTenant } from '@/app/actions/tenant'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Key, ExternalLink } from 'lucide-react'

export default async function SettingsPage() {
    const tenant = await getCurrentTenant()

    if (!tenant) {
        return null
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Inställningar</h1>
                <p className="text-slate-400 mt-1">Hantera din organisations konfiguration</p>
            </div>

            <div className="space-y-6 max-w-2xl">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">Organisation</CardTitle>
                        <CardDescription className="text-slate-400">
                            Grundläggande information om din organisation
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Organisationsnamn</Label>
                            <Input
                                value={tenant.name}
                                disabled
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">URL-slug</Label>
                            <Input
                                value={tenant.slug}
                                disabled
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Kontakt-email</Label>
                            <Input
                                value={tenant.contact_email}
                                disabled
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Key className="h-5 w-5 text-emerald-500" />
                            Kryptering
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Din krypteringskonfiguration
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                ✓ Publik nyckel konfigurerad
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                            Din publika nyckel används för att kryptera inkommande rapporter.
                            Den privata nyckeln behövs för att dekryptera och läsa dem.
                        </p>
                        <div className="bg-slate-800 rounded-lg p-4">
                            <p className="text-xs text-slate-500 font-mono break-all">
                                {tenant.public_key?.slice(0, 100)}...
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">Din rapportlänk</CardTitle>
                        <CardDescription className="text-slate-400">
                            Dela denna länk med anställda för anonym rapportering
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                            <code className="text-emerald-400">
                                vissel-box.se/{tenant.slug}
                            </code>
                            <a
                                href={`/${tenant.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:text-emerald-300"
                            >
                                <ExternalLink className="h-5 w-5" />
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
