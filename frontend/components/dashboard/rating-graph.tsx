"use client";
// builtin

// external
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// internal
import type { GraphData } from "@/lib/dashboard/types";


interface RatingGraphProps {
    data: GraphData;
}

export function RatingGraph({ data }: RatingGraphProps) {
    return (
        <>
            <h3 className="text-lg font-semibold mb-2">Rating Over Time</h3>
            <div className="bg-white rounded shadow p-4">
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={data.points} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={["auto", "auto"]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="rating" stroke="#2563eb" fill="#93c5fd" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </>
    );
}