import React from 'react';

export default function ProductCard({ product }) {
  return (
    <div className="group cursor-pointer flex flex-col h-full">
      {/* 1. IMAGE CONTAINER WITH LIGHT BACKGROUND ASPECT MASK */}
      <div className="relative aspect-square w-full bg-[#f6f6f6] overflow-hidden rounded-sm">
        {/* Heart icon positioning anchor */}
        <button 
          className="absolute top-3 right-3 p-1.5 bg-white/80 hover:bg-white rounded-full transition-colors shadow-sm"
          aria-label="Add to Wishlist"
        >
          <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        
        {/* Product image with subtle micro-zoom transition on card hover */}
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-full object-cover mix-blend-multiply group-hover:scale-[1.02] transition-transform duration-300"
        />
      </div>

      {/* 2. TEXT DETAILS SUMMARY PANEL */}
      <div className="mt-3 flex flex-col flex-grow text-left text-[15px] leading-relaxed">
        {/* Highlight Tag (e.g., "Just In", "Best Seller") */}
        {product.tag && (
          <span className="text-[#9e3500] font-medium font-sans text-sm">
            {product.tag}
          </span>
        )}

        {/* Core Identity */}
        <h3 className="font-medium text-slate-900 mt-0.5">{product.name}</h3>
        
        {/* Target Demographic/Category */}
        <p className="text-slate-500 font-normal">{product.subCategory}</p>

        {/* Color Variations Indicators Grid */}
        <div className="flex items-center gap-1.5 mt-1.5 mb-2">
          {product.colors?.map((colorHex, idx) => (
            <span 
              key={idx} 
              className="w-3 h-3 rounded-full border border-black/10 inline-block" 
              style={{ backgroundColor: colorHex }}
            />
          ))}
        </div>

        {/* Final Price Block pushing to bottom naturally */}
        <div className="mt-auto font-medium text-slate-900">
          {new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          }).format(product.price)}
        </div>
      </div>
    </div>
  );
}
