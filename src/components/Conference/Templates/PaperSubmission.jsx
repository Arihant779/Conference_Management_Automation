import React from 'react';

const PaperSubmission = () => {
  return (
    <div className="max-w-6xl mx-auto p-8 text-slate-200">
      <h2 className="text-3xl font-bold text-white mb-6">
        Research Paper Submission
      </h2>

      <div className="bg-[#0f1117] border border-white/10 rounded-xl p-8 space-y-8">

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold mb-2">Title</label>
          <input
            type="text"
            placeholder="Please write in Title Case (NOT IN ALL CAPITALS)"
            className="w-full p-3 rounded-lg bg-black border border-white/10"
          />
        </div>

        {/* Abstract */}
        <div>
          <label className="block text-sm font-semibold mb-2">Abstract</label>
          <textarea
            rows={4}
            placeholder="Short background information about the research"
            className="w-full p-3 rounded-lg bg-black border border-white/10"
          />
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-semibold mb-2">Keywords</label>
          <input
            type="text"
            placeholder="Comma separated list (leave space after comma)"
            className="w-full p-3 rounded-lg bg-black border border-white/10"
          />
        </div>

        {/* Research Area */}
        <div>
          <label className="block text-sm font-semibold mb-2">Research Area</label>
          <select className="w-full p-3 rounded-lg bg-black border border-white/10">
            <option>Select Research Area</option>
            <option>Artificial Intelligence</option>
            <option>Machine Learning</option>
            <option>Cyber Security</option>
            <option>Data Science</option>
            <option>Software Engineering</option>
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Select Research Paper
          </label>
          <input
            type="file"
            className="w-full p-3 rounded-lg bg-black border border-white/10"
          />
          <p className="text-xs text-slate-400 mt-2">
            (.docx or .doc or .odt only) — Use single column layout, NOT two columns
          </p>
        </div>

        {/* Message to Editor */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Message to the Editor or Reviewer
          </label>
          <textarea
            rows={4}
            placeholder="Write any special message..."
            className="w-full p-3 rounded-lg bg-black border border-white/10"
          />
        </div>

        {/* Authors Section */}
        <div>
          <h3 className="text-xl font-bold mb-4">Authors' Details</h3>

          <div className="overflow-x-auto">
            <table className="w-full border border-white/10 text-sm">
              <thead className="bg-black">
                <tr className="text-left">
                  <th className="p-2 border border-white/10">#</th>
                  <th className="p-2 border border-white/10">Salutation</th>
                  <th className="p-2 border border-white/10">First Name</th>
                  <th className="p-2 border border-white/10">Middle Name</th>
                  <th className="p-2 border border-white/10">Last Name</th>
                  <th className="p-2 border border-white/10">Designation</th>
                  <th className="p-2 border border-white/10">Department</th>
                  <th className="p-2 border border-white/10">Organization</th>
                  <th className="p-2 border border-white/10">Email</th>
                  <th className="p-2 border border-white/10">Mobile</th>
                  <th className="p-2 border border-white/10">ORCID iD</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td className="p-2 border border-white/10">1</td>

                  <td className="p-2 border border-white/10">
                    <select className="bg-black border border-white/10 p-2 rounded w-full">
                      <option>Mr.</option>
                      <option>Ms.</option>
                      <option>Dr.</option>
                      <option>Prof.</option>
                    </select>
                  </td>

                  <td className="p-2 border border-white/10">
                    <input className="bg-black border border-white/10 p-2 rounded w-full" placeholder="(Title Case)" />
                  </td>

                  <td className="p-2 border border-white/10">
                    <input className="bg-black border border-white/10 p-2 rounded w-full" />
                  </td>

                  <td className="p-2 border border-white/10">
                    <input className="bg-black border border-white/10 p-2 rounded w-full" placeholder="(Title Case)" />
                  </td>

                  <td className="p-2 border border-white/10">
                    <input className="bg-black border border-white/10 p-2 rounded w-full" />
                  </td>

                  <td className="p-2 border border-white/10">
                    <input className="bg-black border border-white/10 p-2 rounded w-full" />
                  </td>

                  <td className="p-2 border border-white/10">
                    <input className="bg-black border border-white/10 p-2 rounded w-full" />
                  </td>

                  <td className="p-2 border border-white/10">
                    <input className="bg-black border border-white/10 p-2 rounded w-full" />
                  </td>

                  <td className="p-2 border border-white/10">
                    <input className="bg-black border border-white/10 p-2 rounded w-full" />
                  </td>

                  <td className="p-2 border border-white/10">
                    <input className="bg-black border border-white/10 p-2 rounded w-full" placeholder="0000-0000-0000-0000" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit */}
        <button className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold text-white">
          Submit Research Paper
        </button>
      </div>
    </div>
  );
};

export default PaperSubmission;
