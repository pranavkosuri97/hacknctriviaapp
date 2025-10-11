"use client";

// builtin
import { useState } from "react";

// external
import { useRouter } from "next/navigation";

// internal
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { createProfile } from "@/lib/auth/actions";


export function CreateProfileForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        username: "",
    });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const supabase = createClient();
            await createProfile(supabase, formData);
            router.push("/dashboard");
        } catch (error) {
            console.error("Profile creation error:", error);
            setErrors({
                submit: error instanceof Error ? error.message : "Failed to create profile"
            });
        } finally {
            setIsLoading(false);
        }
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
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Create Your Profile</CardTitle>
                <CardDescription className="text-center">
                    Complete your profile to get started
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

                    {errors.submit && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                            {errors.submit}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? "Creating Profile..." : "Create Profile"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
