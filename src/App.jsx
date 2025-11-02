// src/App.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

// --- Import Chatbot and Login ---
import { Chatbot } from './Chatbot';
import Login from './Login';

// --- CONFIGURATION ---
const API_ENDPOINT = "https://1pnszjn9th.execute-api.us-east-1.amazonaws.com";

// ---------------- DASHBOARD COMPONENT ----------------
const DashboardCharts = ({ documents }) => {
  if (documents.length === 0) {
    return (
      <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg mb-10 text-center">
        <h2 className="text-2xl font-semibold mb-4">Spending Dashboard</h2>
        <p className="text-gray-400">Upload a document to see your financial breakdown.</p>
      </div>
    );
  }

  const categoryData = documents.reduce((acc, doc) => {
    const category = doc.data?.category || 'Other';
    const amount = parseFloat(doc.data?.totalAmount) || 0;
    
    if (!acc[category]) acc[category] = 0;
    acc[category] += amount;
    return acc;
  }, {});

  const chartData = Object.keys(categoryData).map(key => ({
    name: key,
    value: categoryData[key],
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF80A2'];

  return (
    <div className="max-w-4xl mx-auto mb-10 flex flex-col md:flex-row gap-8">
      {/* Bar Chart */}
      <div className="w-full md:w-1/2 bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-center">Spending by Category</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#555" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} cursor={{fill: 'rgba(255,255,255,0.1)'}} />
              <Bar dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Pie Chart */}
      <div className="w-full md:w-1/2 bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-center">Category Breakdown</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ---------------- MAIN APP ----------------
function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Welcome!');
  const [isLoading, setIsLoading] = useState(false);

  // NEW: Login state
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setStatusMessage('Fetching documents...');
      const response = await axios.get(`${API_ENDPOINT}/documents`);
      const sortedDocs = response.data.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
      setDocuments(sortedDocs);
      setStatusMessage('Documents loaded.');
    } catch (error) {
      console.error("Error fetching documents:", error);
      setStatusMessage('Error fetching documents.');
    } finally {
      setIsLoading(false);
    }
  };

  const pollForResults = () => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      await fetchDocuments();
      if (attempts >= 7) {
        clearInterval(interval);
        setStatusMessage('Processing complete.');
      }
    }, 3000);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setStatusMessage('Please select a file first.');
      return;
    }
    setIsLoading(true);
    setStatusMessage('1/3: Getting upload URL...');

    try {
      const uploadUrlResponse = await axios.post(
        `${API_ENDPOINT}/upload`,
        { fileName: selectedFile.name },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const { uploadUrl } = uploadUrlResponse.data;
      setStatusMessage('2/3: Uploading file to S3...');
      await axios.put(uploadUrl, selectedFile, {
        headers: { 'Content-Type': selectedFile.type },
      });
      setStatusMessage('3/3: File uploaded! Pipeline is processing...');
      pollForResults();
    } catch (error) {
      console.error("Upload failed:", error);
      setStatusMessage('Upload failed. See console for details.');
      setIsLoading(false);
    } finally {
      setSelectedFile(null);
      e.target.reset();
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  // --- MAIN DASHBOARD AFTER LOGIN ---
  return (
    <div className="bg-gray-900 min-h-screen text-white p-8">
      <header className="max-w-4xl mx-auto mb-10">
        <h1 className="text-4xl font-bold text-center text-blue-400">📄 DocuExtract AI - V3</h1>
        <p className="text-center text-gray-400">Personal Finance Tracker & AI Assistant</p>
      </header>

      {/* Upload Form */}
      <div className="max-w-xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg mb-10">
        <form onSubmit={handleUpload}>
          <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">
            Select a file to upload:
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Upload and Process'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">{statusMessage}</p>
      </div>

      {/* Chatbot */}
      <Chatbot />

      {/* Dashboard */}
      <DashboardCharts documents={documents} />

      {/* Results Table */}
      <div className="max-w-4xl mx-auto mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Transaction History</h2>
          <button
            onClick={fetchDocuments}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto bg-gray-800 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">File Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Amount</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <tr key={doc.documentId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{doc.documentId.split('/').pop().substring(14)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyan-300">{doc.data?.category || '...'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{doc.data?.vendorName || '...'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{doc.data?.invoiceDate || '...'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{doc.data?.totalAmount || '...'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No documents processed yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
