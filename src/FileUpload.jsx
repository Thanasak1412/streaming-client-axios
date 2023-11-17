import imageCompression from "browser-image-compression";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const FileUpload = () => {
  const [files, setFiles] = useState([]);

  const [filesSize, setFilesSize] = useState(0);
  const [isUploaded, setIsUploaded] = useState(false);

  const [responseSubmit, setResponseSubmit] = useState("");

  const axiosInstance = axios.create();

  const handleFileChange = async (event) => {
    const selectedFiles = event.target.files;

    const compressedFiles = [];
    Array.from(selectedFiles).forEach(async (file) => {
      const compressedFile = await imageCompression(file, {
        alwaysKeepResolution: true,
        useWebWorker: true,
      });
      compressedFiles.push(compressedFile);
    });
    setFiles(compressedFiles);
  };

  const uploadFile = () => {
    if (!files.length) {
      console.error("Please select a file");
      return;
    }

    const chunkSize = 1024 * 1024 * 10; // 10 MB chunks

    let start = 0;

    files.forEach(async (file) => {
      let end = Math.min(chunkSize, file.size);

      const readChunk = () => {
        const blob = file.slice(start, end);
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target.result);
          };
          reader.readAsArrayBuffer(blob);
        });
      };

      while (start < file.size) {
        const chunk = await readChunk();

        try {
          const response = await axiosInstance.post(
            "http://localhost:8000/api/upload",
            chunk,
            {
              headers: {
                "Content-Type": "application/octet-stream",
              },
              responseType: "stream",
            }
          );

          if (response.status === 200) {
            setFilesSize((prev) => prev + end);
          }

          console.log("response => ", response.data);
        } catch (error) {
          console.error("Error sending chunk:", error.message);
          break;
        }

        // Update start and end for the next chunk
        const newStart = end;
        const newEnd = Math.min(end + chunkSize, file.size);
        if (newStart < newEnd) {
          start = newStart;
          end = newEnd;
        } else {
          break; // Break if we reached the end of the file
        }
      }
    });

    console.log("File upload complete");
  };

  const handleSubmit = useCallback(async () => {
    const res = await axiosInstance.post(
      "http://localhost:8000/api/submit",
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    setResponseSubmit(res.statusText);
  }, [axiosInstance]);

  useEffect(() => {
    if (!filesSize) {
      return;
    }

    const sizes = files.reduce((acc, curr) => acc + curr.size, 0);

    if (sizes === filesSize) {
      setIsUploaded(true);
    }
  }, [files, filesSize]);

  useEffect(() => {
    if (isUploaded) {
      setTimeout(() => {
        handleSubmit();
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUploaded]);

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        accept="image/jpg, image/png"
      />
      <button onClick={uploadFile}>Upload</button>
      Response to submit: {responseSubmit}
    </div>
  );
};

export default FileUpload;
