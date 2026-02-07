'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Shield, Lock, Send, AlertTriangle, Loader2 } from 'lucide-react'
import { encryptReport } from '@/lib/crypto'
import { submitReport } from '@/app/actions/report'

/**
 * ACCESSIBILITY COMPLIANT: ReportForm
 * ====================================
 * WCAG 2.1 AA Compliance:
 * ✓ Semantic HTML with proper label associations (htmlFor/id)
 * ✓ Keyboard navigation (Tab + Enter flow)
 * ✓ aria-live regions for dynamic status updates
 * ✓ Focus management for error states
 * ✓ Screen reader announcements for encryption status
 */

interface ReportFormProps {
    tenantId: string
    tenantName: string
    publicKey: string
    slug: string
}

type SubmissionStatus = 'idle' | 'encrypting' | 'sending' | 'success' | 'error'

export function ReportForm({ tenantId, tenantName, publicKey, slug }: ReportFormProps) {
    const router = useRouter()
    const [content, setContent] = useState('')
    const [status, setStatus] = useState<SubmissionStatus>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Refs for focus management
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const errorRef = useRef<HTMLDivElement>(null)

    // Focus error message when it appears
    useEffect(() => {
        if (errorMessage && errorRef.current) {
            errorRef.current.focus()
        }
    }, [errorMessage])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        if (!content.trim()) {
            setErrorMessage('Vänligen skriv din rapport innan du skickar.')
            setStatus('error')
            return
        }

        if (content.trim().length < 50) {
            setErrorMessage('Din rapport bör innehålla minst 50 tecken för att kunna behandlas.')
            setStatus('error')
            return
        }

        setStatus('encrypting')

        try {
            // Encrypt the content client-side
            const encryptedContent = await encryptReport(content, publicKey)

            setStatus('sending')

            // Submit to server
            const result = await submitReport({
                tenantId,
                encryptedContent,
            })

            if (!result.success) {
                throw new Error(result.error || 'Failed to submit report')
            }

            setStatus('success')
            // Redirect to success page
            router.push(`/${slug}/success`)
        } catch (err) {
            console.error('Failed to submit report:', err)
            setErrorMessage('Ett fel uppstod. Vänligen försök igen.')
            setStatus('error')
        }
    }

    // Aria-live message based on status
    const getStatusAnnouncement = (): string => {
        switch (status) {
            case 'encrypting':
                return 'Krypterar din rapport...'
            case 'sending':
                return 'Skickar krypterad rapport till server...'
            case 'success':
                return 'Rapport skickad! Omdirigerar till bekräftelsesidan.'
            case 'error':
                return errorMessage || 'Ett fel uppstod.'
            default:
                return ''
        }
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
                        <CardTitle className="text-xl text-white" id="report-form-title">
                            Anonym rapport
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Till {tenantName}
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
                    aria-labelledby="report-form-title"
                >
                    {/* Error alert with focus management */}
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

                    {/* Report textarea with proper label */}
                    <div className="space-y-2">
                        <Label htmlFor="report-content" className="text-slate-300">
                            Beskriv vad du vill rapportera
                            <span className="sr-only"> (obligatoriskt, minst 50 tecken)</span>
                        </Label>
                        <Textarea
                            id="report-content"
                            ref={textareaRef}
                            name="report-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Beskriv situationen i detalj. Inkludera relevanta datum, platser och personer om möjligt. Ju mer information, desto bättre kan företaget utreda ärendet."
                            className="min-h-[200px] bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                            disabled={isSubmitting}
                            required
                            aria-required="true"
                            aria-invalid={!!errorMessage}
                            aria-describedby="char-count encryption-info"
                        />
                        <p
                            id="char-count"
                            className="text-xs text-slate-500"
                            aria-live="polite"
                        >
                            {content.length} tecken {content.length < 50 && '(minst 50 krävs)'}
                        </p>
                    </div>

                    {/* Encryption status info */}
                    <div
                        id="encryption-info"
                        className="bg-slate-700/30 rounded-lg p-4 space-y-2"
                    >
                        <div className="flex items-center gap-2 text-sm text-emerald-400">
                            <Shield className="h-4 w-4" aria-hidden="true" />
                            <span className="font-medium">Krypteringsstatus</span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Din rapport krypteras i din webbläsare innan den skickas.
                            Servern kan aldrig läsa innehållet.
                        </p>
                    </div>

                    {/* Submit button */}
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isSubmitting}
                        aria-busy={isSubmitting}
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

                    <p className="text-xs text-center text-slate-500">
                        Genom att skicka godkänner du att din krypterade rapport
                        lagras enligt GDPR tills ärendet är löst.
                    </p>
                </form>
            </CardContent>
        </Card>
    )
}
