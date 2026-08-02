import { useState } from 'react';

export const useFaceRegistration = () => {
  const [preview, setPreview] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [faceStatus, setFaceStatus] = useState('Chưa tải ảnh');

  const onFileChange = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setFaceStatus('Ảnh đã chọn, đang chờ kiểm tra Face');
  };

  const uploadFace = async (uploadFn) => {
    if (!selectedFile) return null;
    const result = await uploadFn(selectedFile);
    setFaceStatus(result?.ok ? 'Face đã được cập nhật thành công' : 'Face chưa được cập nhật');
    return result;
  };

  return {
    preview,
    selectedFile,
    faceStatus,
    onFileChange,
    uploadFace,
  };
};
