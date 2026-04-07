"use client";

import React, { useState } from 'react';
import Groq from 'groq-sdk';
import * as XLSX from 'xlsx';
import { Settings, Inbox, Play, Download, CheckCircle, AlertCircle } from 'lucide-react';

const MOCK_EMAILS = [
  {
    id: 1,
    subject: "RFQ - Nurix Therapeutics - NUR-CS-01-26",
    sender: "Anupam Goel <anupam.goel@survivaltechnologies.com>",
    date: "2026-02-18",
    body: `Dear Sir,
We are responding to your RFP code: NUR-CS-01-26 for 5-Fluoropicolinic acid.
We can offer the following materials:
Stage-1:
- 2,2,3,3-tetrafluoro-1-propanol: 5.31 Kg @ 4400.00 INR per Kg. Source: Angene, China. Del 2-5 weeks
- Triethylamine: 4.88 Kg @ 627.00 INR per Kg. Source: Azole, India. Del 1-2 weeks
- p-Toluenesulfonyl chloride: 9.19 Kg @ 100.00 INR per Kg. Source: Commercial, India. Del 1-2 weeks
++ ex works...
Best Regards,
Anupam Goel
AVP - SALES AND MARKETING
SURVIVAL TECHNOLOGIES PVT LIMITED`
  },
  {
    id: 2,
    subject: "Quote Response: Solvents and Reagents",
    sender: "Sales Team <sales@sainor.com>",
    date: "2026-02-19",
    body: `Hello Procurement,
Please find our quote for the requested chemicals below:
- n-BuLi in THF (2.5M): 33.62 Ltr at 2800.00 INR/Ltr. From Sainor (India). Lead time 1-2 weeks.
- THF: 43.38 Ltr at 200.00 INR/Ltr. Commercial, India. 1-2 weeks.
- Sodium bicarbonate: 20.02 Kg at 60.00 INR/kg. Commercial, India. 1-2 week.
These prices include 100% contingency delivery.
Regards,
Sales Office
Sainor Life Sciences`
  },
  {
    id: 3,
    subject: "Re: Request for Quote - Stage 1 Solvents",
    sender: "info@chemcommercial.in",
    date: "2026-02-20",
    body: `Hi,
We can supply the following solvents for your process:
- DCM: 303.49 Kg @ 50.00 INR/Kg. Commercial, India. 1-2 weeks lead time.
- Sodium chloride: 26.53 Kg @ 15.00 INR/Kg. Commercial, India. 1-2 weeks.
- Ethyl acetate: 47.87 Kg @ 90.00 INR/Kg. Commercial, India. 1-2 weeks.
- n-hexane: 284.43 Kg @ 110.00 INR/Kg. Commercial, India. 1-2 weeks.
Thanks,
Commercial Chemicals India`
  }
];

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleExtraction = async () => {
    if (!apiKey) {
      alert("Please provide a Groq API Key.");
      return;
    }

    setLoading(true);
    setExtractedData([]);
    setStatus('Initializing Groq Model...');
    
    try {
      const client = new Groq({ 
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      const systemPrompt = `You are an expert AI data extraction assistant for a Life Sciences company.
Given an email containing a Request for Quote (RFQ) for chemical compositions, extract the chemical items listed and return ONLY a valid JSON array of objects.
Do not wrap the JSON in Markdown formatting (no \`\`\`json). Output exactly the raw JSON array.
Each object in the array should conform to this structure:
{
  "Chemical Name": "Name of the chemical",
  "Qty": "Numerical quantity (e.g. 5.31) without text",
  "Units": "Units (e.g., Kg, Ltr)",
  "Unit Cost (INR)": "Price per unit as clean numeric value",
  "Source": "Name of the vendor/company providing the quote",
  "Country": "Country of the vendor",
  "Lead Time": "Expected delivery time (e.g., 1-2 weeks)"
}
If a field is not present within the text, use null for numerical fields or empty string for text fields.`;

      let allData: any[] = [];
      let i = 1;
      
      for (const email of MOCK_EMAILS) {
        setStatus(\`Extracting data from email \${i} of \${MOCK_EMAILS.length}...\`);
        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Extract data from this email:\\n\\n" + email.body }
            ],
            model: "llama3-8b-8192",
            temperature: 0,
            max_tokens: 1024
        });
        
        let rawText = response.choices[0].message.content || '[]';
        if (rawText.startsWith('\`\`\`json')) {
            rawText = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
        } else if (rawText.startsWith('\`\`\`')) {
            rawText = rawText.replace(/\`\`\`/g, '');
        }
        
        try {
            const parsed = JSON.parse(rawText.trim());
            const items = Array.isArray(parsed) ? parsed : [parsed];
            allData = [...allData, ...items];
        } catch (e) {
            console.error("JSON Error", rawText);
        }
        i++;
      }

      // calculate totals
      const enhancedData = allData.map(item => {
        const qty = parseFloat(item.Qty) || 0;
        const unitCost = parseFloat(item["Unit Cost (INR)"]) || 0;
        return {
          ...item,
          "Total Cost (INR)": qty * unitCost
        };
      });

      setExtractedData(enhancedData);
      setStatus('Extraction Complete!');
    } catch (err: any) {
      console.error(err);
      setStatus(\`Error: \${err.message}\`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (extractedData.length === 0) return;
    
    // Convert to Excel
    const worksheet = XLSX.utils.json_to_sheet(extractedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted RFQs");
    
    // Download
    XLSX.writeFile(workbook, "Automated_RFQ_Extraction.xlsx");
  };

  return (
    <div className="min-h-screen bg-[#0e1117] text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4 bg-[#1e212b] border-r border-[#333] p-6 flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-[#333] pb-4">
          <Settings className="text-[#00f2fe]" />
          <h2 className="text-xl font-semibold">Configuration</h2>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400">Groq API Key</label>
          <input 
            type="password" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="bg-[#0e1117] border border-[#444] rounded-md p-2 text-white focus:outline-none focus:border-[#00f2fe]"
            placeholder="gsk_..."
          />
          <p className="text-xs text-gray-500">Your key stays locally in the browser.</p>
        </div>

        <div className="mt-8">
          <h3 className="text-md font-medium text-gray-300">Powered by:</h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-400">
            <li>• Groq Fast Inference</li>
            <li>• Next.js 14 App Router</li>
            <li>• SheetJS (Excel)</li>
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full md:w-3/4 p-8 flex flex-col gap-8 h-screen overflow-y-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span role="img" aria-label="dna">🧬</span> 
            Auto-Populate RFQs via AI
          </h1>
          <p className="text-gray-400 mt-2">Impress clients with instant workflow automation. Extracts unstructured Request for Quote (RFQ) emails into Excel.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inbox View */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-[#333] pb-2">
              <Inbox size={20} className="text-blue-400" />
              Inbox (3 Mock RFQs)
            </h2>
            
            <div className="space-y-4">
              {MOCK_EMAILS.map((em) => (
                <div key={em.id} className="bg-[#1a1c23] p-4 rounded-lg border-l-4 border-[#00f2fe]">
                  <h4 className="font-medium">{em.subject}</h4>
                  <div className="text-xs text-gray-400 my-1">From: {em.sender} | Date: {em.date}</div>
                  <div className="text-sm text-gray-300 mt-3 whitespace-pre-wrap line-clamp-3">
                    {em.body}
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleExtraction}
              disabled={loading}
              className="mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white py-3 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <span className="animate-pulse">Running AI...</span> : <><Play size={18} /> Run AI Extraction</>}
            </button>
            {status && (
              <div className="text-sm text-center text-blue-300 mt-2">{status}</div>
            )}
          </div>

          {/* Results View */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-[#333] pb-2">
              <CheckCircle size={20} className="text-emerald-400" />
              Extracted Results
            </h2>
            
            {extractedData.length > 0 ? (
              <div className="bg-[#1a1c23] rounded-lg overflow-hidden border border-[#333]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#2a2d36] text-gray-300 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Chemical Name</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Units</th>
                        <th className="px-4 py-3">Total Cost (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedData.map((row, idx) => (
                        <tr key={idx} className="border-t border-[#333] hover:bg-[#22252e]">
                          <td className="px-4 py-3 font-medium text-blue-200">{row['Chemical Name']}</td>
                          <td className="px-4 py-3">{row['Qty']}</td>
                          <td className="px-4 py-3">{row['Units']}</td>
                          <td className="px-4 py-3 text-emerald-300">{row['Total Cost (INR)']}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-4 bg-[#2a2d36] border-t border-[#333] flex justify-between items-center">
                  <span className="text-sm text-gray-400">{extractedData.length} items extracted</span>
                  <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-[#2ea043] text-white px-4 py-2 rounded font-semibold hover:bg-[#3fb950] transition-colors"
                  >
                    <Download size={16} /> Download Excel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 bg-[#1a1c23] border border-[#333] rounded-lg border-dashed">
                <AlertCircle size={48} className="text-gray-500 mb-4" />
                <p className="text-gray-400 text-center">Execute the AI extraction on the Inbox to view and download the structured RFQ table.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
