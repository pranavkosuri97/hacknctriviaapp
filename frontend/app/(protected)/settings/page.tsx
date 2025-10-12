// builtin

// external
import { Card } from "pixel-retroui";

// internal
import { SettingsPage } from "@/components/settings/settings-page";

export default function Settings() {
    return (
        <Card bg="#ffffff" textColor="#000000" className="container mx-auto py-8 px-4 rounded-xl shadow-md">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-minecraft text-gray-900 mb-2">
                        Account Settings
                    </h1>
                    <p className="text-gray-600">
                        Manage your profile and account preferences
                    </p>
                </div>

                <SettingsPage />
            </div>
        </Card>
    );
}