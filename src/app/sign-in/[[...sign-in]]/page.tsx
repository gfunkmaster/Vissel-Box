import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <SignIn
                appearance={{
                    elements: {
                        rootBox: 'mx-auto',
                        card: 'bg-slate-900 border-slate-800',
                    },
                }}
            />
        </div>
    )
}
