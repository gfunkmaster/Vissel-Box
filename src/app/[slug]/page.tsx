import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantBySlug } from '@/app/actions/tenant'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Lock, AlertTriangle } from 'lucide-react'

interface TenantPageProps {
    params: Promise<{ slug: string }>
}

export default async function TenantPage({ params }: TenantPageProps) {
    const { slug } = await params
    const tenant = await getTenantBySlug(slug)

    if (!tenant) {
        notFound()
    }

    if (!tenant.public_key) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <Card className="max-w-md bg-slate-800/50 border-slate-700">
                    <CardHeader className="text-center">
                        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                        <CardTitle className="text-white">Tjänsten ej tillgänglig</CardTitle>
                        <CardDescription className="text-slate-400">
                            Denna organisation har inte slutfört sin konfiguration än.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-700/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-emerald-500" />
                    <span className="text-lg font-semibold text-white">Vissel-Box</span>
                </div>
            </header>

            <main className="container mx-auto px-4 py-16 max-w-2xl">
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                    <CardHeader className="text-center pb-2">
                        <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                            <Lock className="h-8 w-8 text-emerald-500" />
                        </div>
                        <CardTitle className="text-2xl text-white">
                            Säker visselblåsning
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-lg mt-2">
                            {tenant.name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-6">
                        <p className="text-slate-300">
                            Du kan nu rapportera misstänkta oegentligheter anonymt och säkert.
                            Din rapport kommer att krypteras innan den skickas – ingen kan läsa
                            innehållet förutom behörig personal på {tenant.name}.
                        </p>

                        <div className="bg-slate-700/50 rounded-lg p-4 text-left space-y-2">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <Shield className="h-4 w-4 text-emerald-500" />
                                Dina rättigheter
                            </h3>
                            <ul className="text-sm text-slate-400 space-y-1">
                                <li>• Du rapporterar helt anonymt</li>
                                <li>• Din IP-adress sparas inte</li>
                                <li>• Rapporten krypteras i din webbläsare</li>
                                <li>• Du skyddas av svensk visselblåsarlag</li>
                            </ul>
                        </div>

                        <Link href={`/${slug}/report`}>
                            <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                                Skicka en rapport
                            </Button>
                        </Link>

                        <p className="text-xs text-slate-500">
                            Genom att fortsätta godkänner du att din krypterade rapport
                            lagras säkert enligt GDPR.
                        </p>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
