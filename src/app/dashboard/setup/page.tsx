'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Key, AlertTriangle, Loader2, CheckCircle2, Download, Lock } from 'lucide-react'
import { generateKeyPair, downloadPrivateKey } from '@/lib/crypto'
import { activateTenantWithPublicKey } from '@/app/actions/tenant'

export default function SetupPage() {
    const router = useRouter()
    const [step, setStep] = useState<'ready' | 'generating' | 'download' | 'complete'>('ready')
    const [error, setError] = useState<string | null>(null)
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [privateKeyDownloaded, setPrivateKeyDownloaded] = useState(false)

    const handleGenerateKeys = async () => {
        setStep('generating')
        setError(null)

        try {
            // Generate keys entirely in browser
            const keys = await generateKeyPair('Tenant Admin', 'admin@company.com')

            setPublicKey(keys.publicKey)

            // Immediately trigger download of private key
            downloadPrivateKey(keys.privateKey, 'private-key.pem')
            setPrivateKeyDownloaded(true)

            setStep('download')
        } catch (err) {
            console.error('Key generation failed:', err)
            setError('Kunde inte generera nycklar. Vänligen försök igen.')
            setStep('ready')
        }
    }

    const handleActivate = async () => {
        if (!publicKey) {
            setError('Ingen publik nyckel hittades.')
            return
        }

        if (!privateKeyDownloaded) {
            setError('Du måste ladda ner din privata nyckel först.')
            return
        }

        setStep('generating') // reuse for loading state
        setError(null)

        try {
            // Upload only publicKey to Supabase and mark as Active
            const result = await activateTenantWithPublicKey(publicKey)

            if (!result.success) {
                throw new Error(result.error)
            }

            setStep('complete')

            // Redirect to dashboard after brief delay
            setTimeout(() => {
                router.push('/dashboard')
                router.refresh()
            }, 2000)
        } catch (err) {
            console.error('Activation failed:', err)
            setError(err instanceof Error ? err.message : 'Kunde inte aktivera organisationen.')
            setStep('download')
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="max-w-lg w-full bg-slate-900 border-slate-800">
                <CardHeader className="text-center">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-8 w-8 text-emerald-500" />
                    </div>
                    <CardTitle className="text-2xl text-white">
                        {step === 'complete' ? 'Konfiguration klar!' : 'Konfigurera kryptering'}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        {step === 'ready' && 'Generera säkra nycklar för end-to-end kryptering'}
                        {step === 'generating' && 'Genererar nycklar...'}
                        {step === 'download' && 'Bekräfta att du sparat din privata nyckel'}
                        {step === 'complete' && 'Din organisation är nu aktiv'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {error && (
                        <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {step === 'ready' && (
                        <>
                            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <Lock className="h-5 w-5" />
                                    <span className="font-medium">Zero-Knowledge kryptering</span>
                                </div>
                                <p className="text-sm text-slate-400">
                                    När du klickar på knappen nedan genereras ett krypteringspar
                                    direkt i din webbläsare. Den privata nyckeln laddas ner till
                                    din dator och sparas INTE på våra servrar.
                                </p>
                            </div>

                            <Button
                                onClick={handleGenerateKeys}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6"
                            >
                                <Key className="mr-2 h-5 w-5" />
                                Generera säkra nycklar
                            </Button>
                        </>
                    )}

                    {step === 'generating' && (
                        <div className="text-center py-8">
                            <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
                            <p className="text-slate-400">Genererar RSA 4096-bit nycklar...</p>
                        </div>
                    )}

                    {step === 'download' && (
                        <>
                            <Alert className="bg-yellow-900/30 border-yellow-700 text-yellow-200">
                                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                <AlertDescription className="text-yellow-200">
                                    <strong className="block mb-1">⚠️ KRITISKT VIKTIGT</strong>
                                    Vi sparar INTE din privata nyckel. Om du förlorar den
                                    kan du aldrig dekryptera dina rapporter. Spara filen
                                    på ett säkert ställe (t.ex. lösenordshanterare).
                                </AlertDescription>
                            </Alert>

                            <div className="bg-slate-800 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="font-medium">Privat nyckel nedladdad</span>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Filen <code className="text-emerald-400">private-key.pem</code> har laddats ner.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Button
                                    onClick={handleActivate}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Jag har sparat nyckeln säkert - Aktivera
                                </Button>

                                <Button
                                    onClick={() => publicKey && downloadPrivateKey(publicKey, 'private-key.pem')}
                                    variant="outline"
                                    className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Ladda ner igen
                                </Button>
                            </div>
                        </>
                    )}

                    {step === 'complete' && (
                        <div className="text-center py-4">
                            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                            </div>
                            <p className="text-slate-300 mb-2">Din organisation är nu aktiv!</p>
                            <p className="text-sm text-slate-500">Omdirigerar till dashboard...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
