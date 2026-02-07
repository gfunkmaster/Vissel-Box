import { getCurrentTenant } from '@/app/actions/tenant'
import { getReportCounts } from '@/app/actions/report'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, AlertCircle, CheckCircle2, Archive, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
    const [tenant, counts] = await Promise.all([
        getCurrentTenant(),
        getReportCounts(),
    ])

    if (!tenant) {
        return null
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Välkommen tillbaka</h1>
                <p className="text-slate-400 mt-1">Här är en översikt av dina visselblåsarrapporter</p>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400">Nya rapporter</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-white">{counts.new}</span>
                            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400">Lästa</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-white">{counts.read}</span>
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400">Arkiverade</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-white">{counts.archived}</span>
                            <div className="h-10 w-10 rounded-full bg-slate-500/10 flex items-center justify-center">
                                <Archive className="h-5 w-5 text-slate-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400">Totalt</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-white">{counts.total}</span>
                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick actions */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">Din rapportlänk</CardTitle>
                        <CardDescription className="text-slate-400">
                            Dela denna länk med anställda för anonym rapportering
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <code className="flex-1 bg-slate-800 rounded-lg px-4 py-3 text-emerald-400 text-sm">
                                {typeof window !== 'undefined' ? window.location.origin : 'https://vissel-box.se'}/{tenant.slug}
                            </code>
                            <Link
                                href={`/${tenant.slug}`}
                                target="_blank"
                                className="text-emerald-400 hover:text-emerald-300"
                            >
                                <ExternalLink className="h-5 w-5" />
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">Krypteringsstatus</CardTitle>
                        <CardDescription className="text-slate-400">
                            Din publika nyckel är konfigurerad
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            ✓ Zero-Knowledge aktivt
                        </Badge>
                        <p className="text-slate-500 text-sm mt-3">
                            Alla inkommande rapporter krypteras med din publika nyckel.
                            Endast du kan dekryptera dem med din privata nyckel.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
