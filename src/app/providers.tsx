"use client";

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { RosProvider } from "@/context/RosContext";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <RosProvider>
            <AppRouterCacheProvider>
                {children}
            </AppRouterCacheProvider>
        </RosProvider>
    );
}
