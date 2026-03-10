import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Upload, FileText, Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AnalyzePage = () => {
  const navigate = useNavigate();
  const { user, token, fetchUser } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      } else {
        toast.error('Please upload a PDF file');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        toast.error('Please upload a PDF file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    const userCredits = user?.credits || 0;

    if (userCredits === 0) {
      toast.error('No credits available. Purchase credits to continue.');
      navigate('/pricing');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/resume/analyze`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`Resume analyzed! ${response.data.remaining_credits} credits remaining`);
      await fetchUser();
      navigate(`/result/${response.data.id}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Analysis failed';
      toast.error(message);
      if (message.includes('limit') || message.includes('credit')) {
        setTimeout(() => navigate('/pricing'), 2000);
      }
    } finally {
      setUploading(false);
    }
  };

  const userCredits = user?.credits || 0;
  const canAnalyze = userCredits > 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white" data-testid="analyze-heading">
            Analyze Your Resume
          </h1>
          <p className="text-gray-400">
            Upload your resume to get instant ATS scoring and detailed feedback
          </p>
        </div>

        {/* Credits Display */}
        <div className="mb-6">
          <div className="p-4 bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] border border-white/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-[#9E47FF]" />
                <span className="text-sm font-medium text-gray-400">Available Credits</span>
              </div>
              <p className="text-2xl font-bold text-white">{userCredits}</p>
            </div>
          </div>
        </div>

        {!canAnalyze && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg flex items-start gap-3" data-testid="limit-warning">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-500">No credits available</p>
              <p className="text-sm text-yellow-200/80 mt-1">
                Purchase credits to start analyzing your resume and get AI-powered insights.
              </p>
              <Button
                onClick={() => navigate('/pricing')}
                data-testid="buy-credits-btn"
                size="sm"
                className="mt-3 bg-[#9E47FF] hover:bg-[#8B3FE6] text-white"
              >
                View Pricing & Buy Credits
              </Button>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] rounded-2xl border border-white/10 p-8 shadow-2xl">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? 'border-[#9E47FF] bg-[#9E47FF]/10'
                : 'border-white/20 hover:border-white/30'
            }`}
            data-testid="upload-dropzone"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            
            {file ? (
              <div className="mb-6">
                <FileText className="w-12 h-12 text-[#9E47FF] mx-auto mb-2" />
                <p className="font-medium text-white" data-testid="selected-file-name">{file.name}</p>
                <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-lg font-medium text-white mb-2">
                  Drop your resume here, or click to browse
                </p>
                <p className="text-sm text-gray-400">
                  PDF files only, max 10MB
                </p>
              </div>
            )}

            <input
              type="file"
              id="file-upload"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              data-testid="file-input"
              disabled={!canAnalyze}
            />
            
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload').click()}
                data-testid="browse-files-btn"
                disabled={!canAnalyze}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Browse Files
              </Button>
              
              {file && (
                <Button
                  onClick={() => setFile(null)}
                  data-testid="clear-file-btn"
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {file && canAnalyze && (
            <div className="mt-6">
              <Button
                onClick={handleUpload}
                data-testid="analyze-submit-btn"
                className="w-full h-14 bg-[#9E47FF] hover:bg-[#8B3FE6] text-lg font-medium text-white"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing Resume...
                  </>
                ) : (
                  'Analyze Resume'
                )}
              </Button>
              <p className="text-center text-sm text-gray-400 mt-3">
                This will use 1 credit
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-[#9E47FF]/10 border border-[#9E47FF]/30 rounded-xl p-6">
          <h3 className="font-semibold text-[#9E47FF] mb-3">What you'll get:</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-[#9E47FF] mt-0.5">•</span>
              <span>ATS Score (0-100) with detailed breakdown</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#9E47FF] mt-0.5">•</span>
              <span>Section-wise feedback (Summary, Experience, Skills, Education)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#9E47FF] mt-0.5">•</span>
              <span>Keyword suggestions to improve ATS compatibility</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#9E47FF] mt-0.5">•</span>
              <span>Formatting and structure recommendations</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};