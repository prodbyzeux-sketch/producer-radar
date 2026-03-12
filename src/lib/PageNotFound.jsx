import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0f0f10]">
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-7xl font-light text-[#27272a]">404</h1>
                        <div className="h-0.5 w-16 bg-[#27272a] mx-auto"></div>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-medium text-white">Page Not Found</h2>
                        <p className="text-[#71717a] leading-relaxed">
                            The page <span className="font-medium text-[#a1a1aa]">"{pageName}"</span> could not be found.
                        </p>
                    </div>
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-8 p-4 bg-[#18181b] rounded-lg border border-[#27272a]">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-sm font-medium text-white">Admin Note</p>
                                    <p className="text-sm text-[#71717a] leading-relaxed">
                                        This page hasn't been implemented yet. Ask the AI to implement it.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="pt-6">
                        <button 
                            onClick={() => window.location.href = '/'} 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#3b82f6] transition-colors"
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}