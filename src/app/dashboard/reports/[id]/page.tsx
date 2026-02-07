import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getReportById } from '@/app/actions/report'
import { ReportViewer } from '@/components/report-viewer'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface ReportPageProps {
    params: Promise<{ id: string }>
}

export default async function ReportPage({ params }: ReportPageProps) {
    const { id } = await params
    const report = await getReportById(id)

    if (!report) {
        notFound()
    }

    return (
        <div className="p-8">
            <div className="mb-6">
                <Link href="/dashboard/reports">
                    <Button variant="ghost" className="text-slate-400 hover:text-white -ml-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tillbaka till rapporter
                    </Button>
                </Link>
            </div>

            <ReportViewer report={report} />
        </div>
    )
}
