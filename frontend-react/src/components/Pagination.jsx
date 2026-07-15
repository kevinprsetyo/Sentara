import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange,
    showPageInfo = true,
    compactMobile = true
}) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        
        const pages = [];
        const delta = 1;
        
        // Always show first page
        pages.push(1);
        
        // Current page and surrounding pages
        const left = Math.max(2, currentPage - delta);
        const right = Math.min(totalPages - 1, currentPage + delta);
        
        if (left > 2) pages.push('...');
        
        for (let i = left; i <= right; i++) {
            pages.push(i);
        }
        
        if (right < totalPages - 1) pages.push('...');
        
        // Always show last page
        if (totalPages > 1) pages.push(totalPages);
        
        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 bg-white border-t border-gray-200">
            {/* Page Info */}
            {showPageInfo && (
                <div className="hidden sm:block text-sm text-gray-600 whitespace-nowrap">
                    Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                </div>
            )}
            
            {/* Pagination Controls - Center aligned */}
            <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-1 sm:gap-1 w-full max-w-lg justify-center">
                    {/* Previous Button */}
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[90px] justify-center transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Previous</span>
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1 mx-2 overflow-x-auto scrollbar-hide">
                        {pageNumbers.map((page, index) => {
                            if (page === '...') {
                                return (
                                    <span key={`dots-${index}`} className="px-3 py-2 text-gray-400">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </span>
                                );
                            }
                            
                            return (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page)}
                                    className={`px-3 py-2 min-w-[40px] text-sm font-medium rounded-lg transition-all ${
                                        currentPage === page
                                            ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                    } ${compactMobile ? 'hidden sm:inline-block' : 'inline-block'}`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Next Button */}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[90px] justify-center transition-colors"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            {/* Mobile Compact View */}
            {compactMobile && (
                <div className="sm:hidden flex items-center justify-center w-full mt-2">
                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                        Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pagination;