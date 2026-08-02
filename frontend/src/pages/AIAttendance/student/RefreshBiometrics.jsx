import React from 'react';
import PanelCard from '../components/PanelCard';
import PageHeader from '../components/PageHeader';
import { useFaceRegistration } from '../hooks/student/useFaceRegistration';

const RefreshBiometrics = ({ API_BASE, user }) => {
  const { preview, faceStatus, onFileChange, uploadFace } = useFaceRegistration();

  return (
    <PanelCard>
      <PageHeader title="Refresh Biometrics" />

      <div className="form-grid compact">
        <label>
          Tải ảnh lên
          <input type="file" accept="image/*" onChange={onFileChange} />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => uploadFace(async (file) => ({ ok: Boolean(file), file }))}>
          Upload
        </button>
      </div>

      {preview ? <img src={preview} alt="Preview Face" style={{ maxWidth: 220, marginTop: 12 }} /> : null}
      <p>{faceStatus}</p>
    </PanelCard>
  );
};

export default RefreshBiometrics;
