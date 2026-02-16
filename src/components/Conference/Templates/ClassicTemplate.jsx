import React from 'react';

const ClassicTemplate = ({ conf }) => {
  return (
    <div className="bg-[#f0ece3] min-h-screen text-[#1a1a1a] font-serif">
      <header className="border-b border-[#d8d0c0] bg-[#fdfbf7] py-16 text-center">
        <div className="uppercase tracking-[0.3em] text-[#8c8c8c] text-xs font-sans mb-6">
          {conf.date} • {conf.location}
        </div>
        <h1 className="text-6xl md:text-7xl font-medium mb-6 tracking-tight text-[#2b2b2b]">
          {conf.name}
        </h1>
        <div className="w-16 h-1 bg-[#2b2b2b] mx-auto mt-8"></div>
      </header>
      
      <div className="max-w-6xl mx-auto py-20 px-8">
        <div className="relative mb-24">
          <img 
            src={conf.banner} 
            alt="Banner" 
            className="w-full h-[500px] object-cover shadow-2xl grayscale contrast-125" 
          />
          <div className="absolute -bottom-12 right-12 bg-[#2b2b2b] p-10 max-w-lg shadow-2xl hidden md:block text-white">
            <p className="text-xl leading-relaxed italic opacity-90">
              {conf.description}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 mt-32">
          <div>
            <h2 className="text-3xl border-b-2 border-[#2b2b2b] pb-6 mb-8 font-medium">
              Call for Papers
            </h2>
            <p className="mb-8 text-xl leading-relaxed text-gray-700 font-sans">
              We invite scholars and practitioners to submit their work related to{' '}
              <span className="font-bold">{conf.theme}</span>. Selected papers will be published in our annual proceedings.
            </p>
            <button className="text-white bg-[#2b2b2b] px-10 py-4 hover:bg-black transition duration-300 text-sm tracking-widest uppercase font-sans font-bold">
              Submit Abstract
            </button>
          </div>
          
          <div>
            <h2 className="text-3xl border-b-2 border-[#2b2b2b] pb-6 mb-8 font-medium">
              Registration
            </h2>
            <p className="mb-8 text-xl leading-relaxed text-gray-700 font-sans">
              Registration is now open for all attendees. Early bird discounts apply until next month.
            </p>
            <div className="space-y-4 font-sans text-lg">
              <div className="flex justify-between border-b border-[#d8d0c0] pb-2">
                <span>General Admission</span> 
                <span className="font-bold">$200</span>
              </div>
              <div className="flex justify-between border-b border-[#d8d0c0] pb-2">
                <span>Student</span> 
                <span className="font-bold">$100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassicTemplate;
