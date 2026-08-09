import cv2
import numpy as np
import onnxruntime as ort

# Load a test image (create a dummy face-like image or just test on an actual photo if available)
# Create a dummy image with face color
img = np.ones((80, 80, 3), dtype=np.uint8) * 128
cv2.circle(img, (40, 40), 20, (200, 150, 150), -1)

session = ort.InferenceSession("core/models/silent_face.onnx", providers=["CPUExecutionProvider"])
input_name = session.get_inputs()[0].name

def test_preprocess(img_data):
    img_data = np.transpose(img_data, (2, 0, 1))
    img_data = np.expand_dims(img_data, axis=0)
    outputs = session.run(None, {input_name: img_data.astype(np.float32)})
    logits = np.array(outputs[0]).flatten()
    exp_logits = np.exp(logits - np.max(logits))
    probs = exp_logits / np.sum(exp_logits)
    return probs

print("1. Raw (0-255) BGR:", test_preprocess(img))
print("2. Div 255 BGR:", test_preprocess(img / 255.0))
print("3. Raw RGB:", test_preprocess(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
print("4. Div 255 RGB:", test_preprocess(cv2.cvtColor(img, cv2.COLOR_BGR2RGB) / 255.0))

