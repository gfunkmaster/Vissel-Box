'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Lock, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { encryptReport } from '@/lib/crypto'
import { submitReport } from '@/app/actions/report'

/**
 * ACCESSIBILITY COMPLIANT: SubmitForm
 * ====================================
 * WCAG 2.1 AA Compliance:
 * ✓ Semantic HTML with proper label associations (htmlFor/id)
 * ✓ Keyboard navigation (Tab + Enter flow)
 * ✓ aria-live regions for dynamic status updates
 * ✓ Focus management for error states
 * ✓ Screen reader announcements for encryption status
 */

interface SubmitFormProps {
    tenantId: string
    tenantName: string
    publicKey: string
    slug: string
}

// Status messages for aria-live announcements
type SubmissionStatus = 'idle' | 'encrypting' | 'sending' | 'success' | 'error'

export function SubmitForm({ tenantId, tenantName, publicKey, slug }: SubmitFormProps) {
    const [content, setContent] = useState('')
    const [status, setStatus] = useState<SubmissionStatus>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Refs for focus management
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const errorRef = useRef<HTMLDivElement>(null)
    const submitButtonRef = useRef<HTMLButtonElement>(null)

    // Focus error message when it appears (accessibility)
    useEffect(() => {
        if (errorMessage && errorRef.current) {
            errorRef.current.focus()
        }
    }, [errorMessage])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!content.trim()) {
            setErrorMessage('Vänligen beskriv din oro eller observation.')
            setStatus('error')
            return
        }

        setErrorMessage(null)
        setStatus('encrypting')

        try {
            // 1. Encrypt locally in browser using publicKey
            const encryptedContent = await encryptReport(content, publicKey)

            setStatus('sending')

            // 2. Send ONLY the encrypted blob to server
            const result = await submitReport({
                tenantId,
                encryptedContent,
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            // 3. Success
            setStatus('success')
        } catch (err) {
            console.error('Submission failed:', err)
            setErrorMessage(err instanceof Error ? err.message : 'Ett fel uppstod. Försök igen.')
            setStatus('error')
        }
    }

    const handleNewReport = () => {
        setStatus('idle')
        setContent('')
        setErrorMessage(null)
        // Focus the textarea after resetting
        setTimeout(() => textareaRef.current?.focus(), 100)
    }

    // Aria-live message based on status
    const getStatusAnnouncement = (): string => {
        switch (status) {
            case 'encrypting':
                return 'Krypterar din rapport...'
            case 'sending':
                return 'Skickar krypterad rapport...'
            case 'success':
                return 'Rapport mottagen säkert. Din rapport har krypterats och skickats.'
            case 'error':
                return errorMessage || 'Ett fel uppstod.'
            default:
                return ''
        }
    }

    // Success state
    if (status === 'success') {
        return (
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur text-center">
                <CardContent className="py-12">
                    {/* Aria-live region for success announcement */}
                    <div
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="sr-only"
                    >
                        Rapport mottagen säkert. Din rapport har krypterats och skickats.
                    </div>

                    <div
                        className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
                        aria-hidden="true"
                    >
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Rapport mottagen säkert
                    </h2>
                    <p className="text-slate-400 mb-6">
                        Din rapport har krypterats och skickats. Ingen metadata sparas.
                    </p>
                    <Button
                        onClick={handleNewReport}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                        Skicka en ny rapport
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const isSubmitting = status === 'encrypting' || status === 'sending'

    return (
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div
                        className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center"
                        aria-hidden="true"
                    >
                        <Lock className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                        <CardTitle className="text-white" id="form-title">
                            Beskriv din oro
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            {tenantName}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Aria-live region for status announcements */}
                <div
                    role="status"
                    aria-live="assertive"
                    aria-atomic="true"
                    className="sr-only"
                >
                    {getStatusAnnouncement()}
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    aria-labelledby="form-title"
                >
                    {/* Error message with focus management */}
                    {errorMessage && (
                        <Alert
                            variant="destructive"
                            className="bg-red-900/20 border-red-800 text-red-300"
                            ref={errorRef}
                            tabIndex={-1}
                            role="alert"
                            aria-live="assertive"
                        >
                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}

                    {/* Encryption info - not focusable, decorative */}
                    <Alert className="bg-slate-700/50 border-slate-600 text-slate-300">
                        <Shield className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                        <AlertDescription>
                            Din rapport krypteras i din webbläsare innan den skickas.
                            Vi kan aldrig se det okrypterade innehållet.
                        </AlertDescription>
                    </Alert>

                    {/* Textarea with proper label association */}
                    <div className="space-y-2">
                        <Label htmlFor="report-content" className="text-slate-300">
                            Din rapport
                            <span className="sr-only"> (obligatoriskt fält)</span>
                        </Label>
                        <Textarea
                            id="report-content"
                            ref={textareaRef}
                            name="report-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Beskriv vad du har observerat eller din oro. Var så detaljerad som möjligt, men undvik att identifiera dig själv om du vill vara anonym."
                            className="min-h-[200px] bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                            disabled={isSubmitting}
                            required
                            aria-required="true"
                            aria-invalid={!!errorMessage}
                            aria-describedby="report-hint report-privacy"
                        />
                        <p id="report-hint" className="text-xs text-slate-500">
                            {content.length} tecken skrivna
                        </p>
                    </div>

                    {/* Submit button */}
                    <Button
                        ref={submitButtonRef}
                        type="submit"
                        disabled={isSubmitting || !content.trim()}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg"
                        aria-busy={isSubmitting}
                        aria-describedby="submit-description"
                    >
                        {status === 'encrypting' ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                                <span>Krypterar...</span>
                            </>
                        ) : status === 'sending' ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                                <span>Skickar...</span>
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-5 w-5" aria-hidden="true" />
                                <span>Skicka krypterad rapport</span>
                            </>
                        )}
                    </Button>

                    <p id="report-privacy" className="text-xs text-center text-slate-500">
                        Din IP-adress loggas inte. Inga cookies används.
                        Rapporten kan endast dekrypteras av {tenantName}.
                    </p>
                </form>
            </CardContent>
        </Card>
    )
}
