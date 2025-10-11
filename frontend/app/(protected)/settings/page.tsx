// builtin

// external

// internal
import { SettingsPage } from "@/components/settings/settings-page";

export default function Settings() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Account Settings
                    </h1>
                    <p className="text-gray-600">
                        Manage your profile and account preferences
                    </p>
                </div>

                <SettingsPage />
            </div>
        </div>
    );
}