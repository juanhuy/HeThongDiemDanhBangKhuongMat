const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return response.json();
};

export const faceService = {
  getPendingFaces: async () => [],
  approveFace: async () => {
    return Promise.reject(new Error('Backend hiện tại không hỗ trợ approve face qua API.'));
  },
  rejectFace: async () => {
    return Promise.reject(new Error('Backend hiện tại không hỗ trợ reject face qua API.'));
  },
};
