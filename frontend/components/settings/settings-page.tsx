"use client";

// builtin
import { useState, useEffect } from "react";

// external
import { useRouter } from "next/navigation";

// internal
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState("");

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        username: "",
    });

    const [originalData, setOriginalData] = useState({
        first_name: "",
        last_name: "",
        username: "",
    });

    // Load user profile on component mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await fetch('/api/settings');

                if (!response.ok) {
                    if (response.status === 401) {
                        router.push('/auth/login');
                        return;
                    }
                    throw new Error('Failed to load profile');
                }

                const data = await response.json();
                const userData = {
                    first_name: data.user.first_name,
                    last_name: data.user.last_name,
                    username: data.user.username,
                };

                setFormData(userData);
                setOriginalData(userData);
            } catch (error) {
                console.error('Error loading profile:', error);
                setErrors({ load: 'Failed to load profile' });
            } finally {
                setIsLoadingProfile(false);
            }
        };

        loadProfile();
    }, [router]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.first_name.trim()) {
            newErrors.first_name = "First name is required";
        }

        if (!formData.last_name.trim()) {
            newErrors.last_name = "Last name is required";
        }

        if (!formData.username.trim()) {
            newErrors.username = "Username is required";
        } else if (formData.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = "Username can only contain letters, numbers, and underscores";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const hasChanges = () => {
        return (
            formData.first_name !== originalData.first_name ||
            formData.last_name !== originalData.last_name ||
            formData.username !== originalData.username
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        if (!hasChanges()) {
            setErrors({ submit: "No changes to save" });
            return;
        }

        setIsLoading(true);
        setErrors({});
        setSuccessMessage("");

        try {
            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            setOriginalData(formData);
            setSuccessMessage("Profile updated successfully!");

            setTimeout(() => setSuccessMessage(""), 3000);

        } catch (error) {
            console.error("Profile update error:", error);
            setErrors({
                submit: error instanceof Error ? error.message : "Failed to update profile"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setFormData(originalData);
        setErrors({});
        setSuccessMessage("");
    };

    const handleChange = (field: keyof typeof formData) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }

        // Clear success message when user makes changes
        if (successMessage) {
            setSuccessMessage("");
        }
    };

    if (isLoadingProfile) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (errors.load) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{errors.load}</p>
                    <Button onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl">Profile Settings</CardTitle>
                <CardDescription>
                    Update your personal information
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                            id="first_name"
                            type="text"
                            placeholder="Enter your first name"
                            value={formData.first_name}
                            onChange={handleChange("first_name")}
                            disabled={isLoading}
                            className={errors.first_name ? "border-red-500" : ""}
                        />
                        {errors.first_name && (
                            <p className="text-sm text-red-500">{errors.first_name}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                            id="last_name"
                            type="text"
                            placeholder="Enter your last name"
                            value={formData.last_name}
                            onChange={handleChange("last_name")}
                            disabled={isLoading}
                            className={errors.last_name ? "border-red-500" : ""}
                        />
                        {errors.last_name && (
                            <p className="text-sm text-red-500">{errors.last_name}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            type="text"
                            placeholder="Choose a unique username"
                            value={formData.username}
                            onChange={handleChange("username")}
                            disabled={isLoading}
                            className={errors.username ? "border-red-500" : ""}
                        />
                        {errors.username && (
                            <p className="text-sm text-red-500">{errors.username}</p>
                        )}
                    </div>

                    {successMessage && (
                        <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                            {successMessage}
                        </div>
                    )}

                    {errors.submit && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                            {errors.submit}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={isLoading || !hasChanges()}
                            className="flex-1"
                        >
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            disabled={isLoading || !hasChanges()}
                        >
                            Reset
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
