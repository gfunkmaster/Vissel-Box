import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getTenantBySlug } from '@/app/actions/tenant'
import { SubmitForm } from '@/components/submit-form'
import { Shield, Lock } from 'lucide-react'

interface SubmitPageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SubmitPageProps): Promise<Metadata> {
    const { slug } = await params
    const tenant = await getTenantBySlug(slug)

    return {
        title: tenant ? `Rapportera till ${tenant.name} | Vissel-Box` : 'Rapportering | Vissel-Box',
        description: 'Skicka en anonym och krypterad rapport säkert.',
    }
}

export default async function SubmitPage({ params }: SubmitPageProps) {
    const { slug } = await params
    const tenant = await getTenantBySlug(slug)

    if (!tenant) {
        notFound()
    }

    if (!tenant.public_key) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Lock className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Rapportering ej tillgänglig
                    </h1>
                    <p className="text-slate-400">
                        Denna organisation har inte slutfört sin konfiguration.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-800 backdrop-blur-sm bg-slate-900/50">
                <div className="container mx-auto px-4 py-4 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-emerald-500" />
                    <span className="font-semibold text-white">Vissel-Box</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">{tenant.name}</span>
                </div>
            </header>

            {/* Main */}
            <main className="container mx-auto px-4 py-12 max-w-2xl">
                <SubmitForm
                    tenantId={tenant.id}
                    tenantName={tenant.name}
                    publicKey={tenant.public_key}
                    slug={slug}
                />
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 mt-auto">
                <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-500">
                    <p>End-to-end krypterad. Ingen metadata sparas.</p>
                </div>
            </footer>
        </div>
    )
}
