import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/app/actions/tenant'
import { OnboardingForm } from '@/components/onboarding-form'

export default async function OnboardingPage() {
    const { userId } = await auth()

    if (!userId) {
        redirect('/sign-in')
    }

    // Check if user already has a tenant
    const tenant = await getCurrentTenant()
    if (tenant) {
        redirect('/dashboard')
    }

    const user = await currentUser()
    const userEmail = user?.emailAddresses[0]?.emailAddress || ''

    return <OnboardingForm userEmail={userEmail} />
}
