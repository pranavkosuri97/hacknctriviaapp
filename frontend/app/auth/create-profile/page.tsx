// builtin

// external

// internal
import { CreateProfileForm } from "@/components/auth/create-profile-form";
import { getCurrentUserClient } from "@/lib/supabase/server";

export default async function CreateProfilePage() {
    await getCurrentUserClient();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome! 👋
                    </h1>
                    <p className="text-gray-600">
                        Let's set up your profile to get started
                    </p>
                </div>

                <CreateProfileForm />
            </div>
        </div>
    );
}
