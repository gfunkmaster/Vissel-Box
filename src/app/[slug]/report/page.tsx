import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantBySlug } from '@/app/actions/tenant'
import { ReportForm } from '@/components/report-form'
import { Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReportPageProps {
    params: Promise<{ slug: string }>
}

export default async function ReportPage({ params }: ReportPageProps) {
    const { slug } = await params
    const tenant = await getTenantBySlug(slug)

    if (!tenant || !tenant.public_key) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-700/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-6 w-6 text-emerald-500" />
                        <span className="text-lg font-semibold text-white">Vissel-Box</span>
                    </div>
                    <Link href={`/${slug}`}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tillbaka
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-2xl">
                <ReportForm
                    tenantId={tenant.id}
                    tenantName={tenant.name}
                    publicKey={tenant.public_key}
                    slug={slug}
                />
            </main>
        </div>
    )
}
