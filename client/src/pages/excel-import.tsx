import { useState } from "react";
  import { useMutation, useQueryClient } from "@tanstack/react-query";
  import { motion } from "framer-motion";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Progress } from "@/components/ui/progress";
  import { Alert, AlertDescription } from "@/components/ui/alert";
  import { Badge } from "@/components/ui/badge";
  import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Download
  } from "lucide-react";

  export default function ExcelImport() {
    const [file, setFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    const queryClient = useQueryClient();

    const importMutation = useMutation({
      mutationFn: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/inventory/import/excel', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Import failed');
        }
        
        return response.json();
      },
      onSuccess: (data) => {
        setImportResult(data);
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      },
    });

    const handleFileSelect = (selectedFile: File) => {
      if (selectedFile && 
          (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        alert('Please select a valid Excel file (.xlsx or .xls)');
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleImport = () => {
      if (file) {
        importMutation.mutate(file);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-cyan-600" />
              Excel Import
            </h1>
            <p className="text-gray-600">Import inventory data from Excel spreadsheets</p>
          </motion.div>

          {/* Upload Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-xl border-0 mb-6">
              <CardHeader>
                <CardTitle>Upload Excel File</CardTitle>
                <CardDescription>
                  Supported formats: .xlsx, .xls. Required columns: Code No., Item Name, Category, Folio No., Expiry Applicable
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                    isDragging 
                      ? 'border-cyan-500 bg-cyan-50' 
                      : 'border-gray-300 hover:border-cyan-400'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {file ? (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="space-y-4"
                    >
                      <FileSpreadsheet className="w-16 h-16 text-green-600 mx-auto" />
                      <div>
                        <p className="font-semibold text-lg text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={handleImport}
                          disabled={importMutation.isPending}
                          className="bg-gradient-to-r from-cyan-600 to-blue-600"
                        >
                          {importMutation.isPending ? 'Importing...' : 'Import Now'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setFile(null)}
                          disabled={importMutation.isPending}
                        >
                          Change File
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-16 h-16 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-semibold text-gray-700 mb-2">
                          Drop your Excel file here
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          or click to browse
                        </p>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(e) => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) {
                              handleFileSelect(selectedFile);
                            }
                          }}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload">
                          <Button asChild variant="outline">
                            <span>Select File</span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {importMutation.isPending && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Importing items...</span>
                      <span className="text-cyan-600 font-semibold">Processing</span>
                    </div>
                    <Progress value={50} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Import Results */}
          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {importResult.errors === 0 ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                    )}
                    Import Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-900">Imported</span>
                      </div>
                      <p className="text-3xl font-bold text-green-700">
                        {importResult.imported}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-5 h-5 text-orange-600" />
                        <span className="font-semibold text-orange-900">Skipped/Errors</span>
                      </div>
                      <p className="text-3xl font-bold text-orange-700">
                        {importResult.errors}
                      </p>
                    </div>
                  </div>

                  {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                    <Alert>
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        <p className="font-semibold mb-2">Some items were skipped:</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {importResult.errorDetails.slice(0, 5).map((error: any, idx: number) => (
                            <li key={idx}>
                              {error.row?.['Item Name'] || 'Unknown item'}: {error.reason}
                            </li>
                          ))}
                          {importResult.errorDetails.length > 5 && (
                            <li className="text-gray-600">
                              ...and {importResult.errorDetails.length - 5} more
                            </li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    onClick={() => {
                      setImportResult(null);
                      setFile(null);
                    }}
                    className="w-full"
                  >
                    Import Another File
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Template Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Excel Template Format
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="font-semibold">Required columns:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li><code className="bg-white px-2 py-0.5 rounded">Code No.</code> - Sequential number</li>
                  <li><code className="bg-white px-2 py-0.5 rounded">Item Name</code> - Full item name</li>
                  <li><code className="bg-white px-2 py-0.5 rounded">Category</code> - Item category</li>
                  <li><code className="bg-white px-2 py-0.5 rounded">Folio No.</code> - Unique folio number</li>
                  <li><code className="bg-white px-2 py-0.5 rounded">Expiry Applicable</code> - "Yes" or "No"</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }
  