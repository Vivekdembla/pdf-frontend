import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Download } from "lucide-react";

interface Fields {
  [key: string]: string;
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [fields, setFields] = useState<Fields>({});
  const [fileLocation, setFileLocation] = useState<string>("");
  const [downloadLink, setDownloadLink] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError("");
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  });

  const uploadTemplate = async () => {
    if (!file) return;

    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await fetch("http://localhost:5001/upload-template", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setFileLocation(data.filePath);

      // Ensure placeholders is an array before setting it
      const placeholdersArray = Array.isArray(data.placeholders)
        ? data.placeholders
        : [];
      setPlaceholders(placeholdersArray);

      // Create fields object only if we have valid placeholders
      const newFields = placeholdersArray.reduce((acc: Fields, key: string) => {
        acc[key] = "";
        return acc;
      }, {});
      setFields(newFields);
    } catch (err) {
      setError("Failed to upload template. Please try again.");
      console.error("Upload error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!fileLocation) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5001/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filePath: fileLocation,
          data: fields,
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const data = await response.json();
      setDownloadLink(data.downloadPath);
    } catch (err) {
      setError("Failed to generate PDF. Please try again.");
      console.error("Generation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            PDF Template Generator
          </h1>
          <p className="mt-2 text-gray-600">
            Upload your PDF template and fill in the placeholders
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div
            {...getRootProps()}
            className="border-2 border-dashed border-blue-300 rounded-lg p-8 transition-colors hover:border-blue-400 cursor-pointer bg-blue-50 hover:bg-blue-100"
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center text-center">
              <Upload className="w-12 h-12 text-blue-500 mb-4" />
              <p className="text-gray-700 font-medium">
                {file
                  ? file.name
                  : "Drag & drop a PDF template here, or click to select one"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Supported format: PDF
              </p>
            </div>
          </div>
          <button
            disabled={!file || isLoading}
            onClick={uploadTemplate}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Template
              </>
            )}
          </button>
        </div>

        {/* Placeholders Section */}
        {placeholders.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Fill Placeholders
              </h2>
            </div>
            <div className="space-y-4">
              {placeholders.map((key) => (
                <div key={key} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    {key}:
                  </label>
                  <input
                    type="text"
                    value={fields[key] || ""}
                    onChange={(e) =>
                      setFields({ ...fields, [key]: e.target.value })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder={`Enter ${key}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate and Download Section */}
        {placeholders.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            <button
              disabled={
                !fileLocation ||
                isLoading ||
                Object.values(fields).some((v) => !v)
              }
              onClick={generatePDF}
              className="w-full max-w-md bg-green-600 text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate PDF
                </>
              )}
            </button>

            {downloadLink && (
              <a
                href={downloadLink}
                onClick={() => {
                  setDownloadLink("");
                }}
                className="w-full max-w-md bg-gray-100 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Processed PDF
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
