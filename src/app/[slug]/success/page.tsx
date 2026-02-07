import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, CheckCircle2, Home } from 'lucide-react'

interface SuccessPageProps {
    params: Promise<{ slug: string }>
}

export default async function SuccessPage({ params }: SuccessPageProps) {
    const { slug } = await params

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <Card className="max-w-md bg-slate-800/50 border-slate-700 backdrop-blur text-center">
                <CardHeader>
                    <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <CardTitle className="text-2xl text-white">
                        Rapport mottagen!
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-base">
                        Din krypterade rapport har skickats säkert.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-700/30 rounded-lg p-4 text-left space-y-2">
                        <div className="flex items-center gap-2 text-sm text-emerald-400">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">Din rapport är skyddad</span>
                        </div>
                        <ul className="text-sm text-slate-400 space-y-1">
                            <li>• Rapporten krypterades i din webbläsare</li>
                            <li>• Ingen identifierande information sparades</li>
                            <li>• Endast behörig personal kan läsa innehållet</li>
                        </ul>
                    </div>

                    <p className="text-sm text-slate-400">
                        Du behöver inte göra något mer. Om du har ytterligare information
                        kan du skicka en ny rapport.
                    </p>

                    <div className="flex flex-col gap-3">
                        <Link href={`/${slug}`}>
                            <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800">
                                <Home className="mr-2 h-4 w-4" />
                                Tillbaka till startsidan
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
