'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Key, Lock, Unlock, AlertTriangle, Loader2, CheckCircle2, Archive, Upload, FileKey } from 'lucide-react'
import { decryptReport } from '@/lib/crypto'
import { updateReportStatus } from '@/app/actions/report'
import type { Report } from '@/lib/supabase/types'

const SESSION_KEY = 'vissel_private_key'

interface ReportViewerProps {
    report: Report
}

export function ReportViewer({ report }: ReportViewerProps) {
    const [privateKey, setPrivateKey] = useState('')
    const [decryptedContent, setDecryptedContent] = useState<string | null>(null)
    const [isDecrypting, setIsDecrypting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
    const [showUnlockModal, setShowUnlockModal] = useState(true)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Check sessionStorage for cached private key on mount
    useEffect(() => {
        const cachedKey = sessionStorage.getItem(SESSION_KEY)
        if (cachedKey) {
            setPrivateKey(cachedKey)
            // Auto-decrypt if we have a cached key
            handleDecryptWithKey(cachedKey)
        }
    }, [])

    const handleDecryptWithKey = async (key: string) => {
        setError(null)
        setIsDecrypting(true)

        try {
            const content = await decryptReport(report.encrypted_content, key)
            setDecryptedContent(content)
            setShowUnlockModal(false)

            // Store in sessionStorage (RAM only, clears on tab close)
            sessionStorage.setItem(SESSION_KEY, key)

            // Mark as read if it was new
            if (report.status === 'new') {
                await updateReportStatus(report.id, 'read')
            }
        } catch (err) {
            console.error('Decryption failed:', err)
            setError('Kunde inte dekryptera rapporten. Kontrollera att du använder rätt privat nyckel.')
            // Clear invalid cached key
            sessionStorage.removeItem(SESSION_KEY)
        } finally {
            setIsDecrypting(false)
        }
    }

    const handleDecrypt = () => handleDecryptWithKey(privateKey)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const text = await file.text()
            setPrivateKey(text)
            // Auto-decrypt after file upload
            handleDecryptWithKey(text)
        } catch (err) {
            setError('Kunde inte läsa filen. Kontrollera att det är en giltig .pem-fil.')
        }
    }

    const handleArchive = async () => {
        setIsUpdatingStatus(true)
        try {
            await updateReportStatus(report.id, 'archived')
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const handleClearKey = () => {
        sessionStorage.removeItem(SESSION_KEY)
        setPrivateKey('')
        setDecryptedContent(null)
        setShowUnlockModal(true)
    }

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('sv-SE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString))
    }

    return (
        <div className="space-y-6">
            {/* Report metadata */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white">Rapport #{report.id.slice(0, 8)}</CardTitle>
                            <CardDescription className="text-slate-400">
                                Mottagen {formatDate(report.created_at)}
                            </CardDescription>
                        </div>
                        <Badge className={
                            report.status === 'new' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                report.status === 'read' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }>
                            {report.status === 'new' ? 'Ny' : report.status === 'read' ? 'Läst' : 'Arkiverad'}
                        </Badge>
                    </div>
                </CardHeader>
            </Card>

            {/* Unlock Modal */}
            <Dialog open={showUnlockModal && !decryptedContent} onOpenChange={setShowUnlockModal}>
                <DialogContent className="bg-slate-900 border-slate-800 sm:max-w-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Lock className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-white">Lås upp rapport</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Ange din privata nyckel för att dekryptera
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                        {error && (
                            <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Alert className="bg-slate-800 border-slate-700 text-slate-300">
                            <Key className="h-4 w-4" />
                            <AlertDescription>
                                Din privata nyckel sparas endast i RAM (sessionStorage) och rensas när du stänger fliken.
                            </AlertDescription>
                        </Alert>

                        {/* File Upload Option */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Ladda upp .pem-fil</Label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pem,.asc,.txt"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                variant="outline"
                                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Välj private-key.pem
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-700" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-slate-900 px-2 text-slate-500">Eller</span>
                            </div>
                        </div>

                        {/* Paste Option */}
                        <div className="space-y-2">
                            <Label htmlFor="privateKey" className="text-slate-300">
                                Klistra in privat nyckel
                            </Label>
                            <Textarea
                                id="privateKey"
                                value={privateKey}
                                onChange={(e) => setPrivateKey(e.target.value)}
                                placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----&#10;...&#10;-----END PGP PRIVATE KEY BLOCK-----"
                                className="min-h-[120px] font-mono text-xs bg-slate-800 border-slate-700 text-white"
                            />
                        </div>

                        <Button
                            onClick={handleDecrypt}
                            disabled={!privateKey || isDecrypting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isDecrypting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Dekrypterar...
                                </>
                            ) : (
                                <>
                                    <Unlock className="mr-2 h-5 w-5" />
                                    Lås upp rapport
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Decrypted content */}
            {decryptedContent && (
                <>
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Dekrypterat innehåll</CardTitle>
                                        <CardDescription className="text-slate-400">
                                            Dekrypterat lokalt i din webbläsare
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleClearKey}
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-white"
                                >
                                    <FileKey className="mr-2 h-4 w-4" />
                                    Byt nyckel
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-slate-800 rounded-lg p-4 whitespace-pre-wrap text-slate-200">
                                {decryptedContent}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Hantera denna rapport</span>
                                <div className="flex gap-2">
                                    {report.status !== 'archived' && (
                                        <Button
                                            onClick={handleArchive}
                                            disabled={isUpdatingStatus}
                                            variant="outline"
                                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                        >
                                            <Archive className="mr-2 h-4 w-4" />
                                            Arkivera
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Locked state when modal is closed but content not decrypted */}
            {!decryptedContent && !showUnlockModal && (
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="py-8 text-center">
                        <Lock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 mb-4">Rapporten är fortfarande krypterad</p>
                        <Button
                            onClick={() => setShowUnlockModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Unlock className="mr-2 h-4 w-4" />
                            Lås upp rapport
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
