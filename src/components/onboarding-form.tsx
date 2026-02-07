'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Key, Download, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import { generateKeyPair, downloadPrivateKey } from '@/lib/crypto'
import { createTenant } from '@/app/actions/tenant'

export function OnboardingForm({ userEmail }: { userEmail: string }) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [privateKeyDownloaded, setPrivateKeyDownloaded] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        contactEmail: userEmail,
        publicKey: '',
        privateKey: '',
    })

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
    }

    const handleGenerateKeys = async () => {
        setIsGenerating(true)
        setError(null)

        try {
            const keys = await generateKeyPair(formData.name, formData.contactEmail)
            setFormData(prev => ({
                ...prev,
                publicKey: keys.publicKey,
                privateKey: keys.privateKey,
            }))
            setStep(2)
        } catch (err) {
            console.error('Key generation failed:', err)
            setError('Kunde inte generera nycklar. Vänligen försök igen.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDownloadPrivateKey = () => {
        downloadPrivateKey(formData.privateKey, `${formData.slug}-private-key.asc`)
        setPrivateKeyDownloaded(true)
    }

    const handleSubmit = async () => {
        if (!privateKeyDownloaded) {
            setError('Du måste ladda ner din privata nyckel innan du fortsätter.')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const result = await createTenant({
                name: formData.name,
                slug: formData.slug,
                contactEmail: formData.contactEmail,
                publicKey: formData.publicKey,
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            router.push('/dashboard')
            router.refresh()
        } catch (err) {
            console.error('Failed to create tenant:', err)
            setError(err instanceof Error ? err.message : 'Kunde inte skapa organisation.')
        } finally {
            setIsSubmitting(false)
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
                        {step === 1 ? 'Konfigurera din organisation' : 'Spara din privata nyckel'}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        {step === 1
                            ? 'Steg 1 av 2: Grundläggande information'
                            : 'Steg 2 av 2: Kritiskt - ladda ner din nyckel'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {step === 1 && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-300">Organisationsnamn</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            name: e.target.value,
                                            slug: generateSlug(e.target.value),
                                        }))
                                    }}
                                    placeholder="Exempel AB"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug" className="text-slate-300">URL-slug</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">vissel-box.se/</span>
                                    <Input
                                        id="slug"
                                        value={formData.slug}
                                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                        placeholder="exempel-ab"
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    Endast små bokstäver, siffror och bindestreck
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">Kontakt-email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>

                            <Button
                                onClick={handleGenerateKeys}
                                disabled={!formData.name || !formData.slug || isGenerating}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Genererar krypteringsnycklar...
                                    </>
                                ) : (
                                    <>
                                        <Key className="mr-2 h-5 w-5" />
                                        Generera krypteringsnycklar
                                    </>
                                )}
                            </Button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Alert className="bg-yellow-900/20 border-yellow-800 text-yellow-300">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>VIKTIGT:</strong> Din privata nyckel är det enda sättet att läsa rapporter.
                                    Vi sparar den INTE. Om du förlorar den kan inga rapporter dekrypteras.
                                </AlertDescription>
                            </Alert>

                            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <Key className="h-5 w-5" />
                                    <span className="font-medium">Din privata nyckel</span>
                                </div>
                                <p className="text-sm text-slate-400">
                                    Klicka nedan för att ladda ner din privata nyckel.
                                    Spara den på ett säkert ställe (t.ex. en lösenordshanterare).
                                </p>
                                <Button
                                    onClick={handleDownloadPrivateKey}
                                    variant="outline"
                                    className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                                >
                                    <Download className="mr-2 h-5 w-5" />
                                    Ladda ner privat nyckel
                                </Button>
                                {privateKeyDownloaded && (
                                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Nyckel nedladdad
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={!privateKeyDownloaded || isSubmitting}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Skapar organisation...
                                    </>
                                ) : (
                                    'Slutför konfiguration'
                                )}
                            </Button>

                            <Button
                                onClick={() => setStep(1)}
                                variant="ghost"
                                className="w-full text-slate-400"
                            >
                                Tillbaka
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
