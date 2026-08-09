import onnxruntime as ort
import numpy as np
import os

model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core", "models", "silent_face.onnx")

session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
inputs = session.get_inputs()
print(f"Inputs: {[(i.name, i.shape, i.type) for i in inputs]}")

outputs = session.get_outputs()
print(f"Outputs: {[(o.name, o.shape, o.type) for o in outputs]}")

# Create dummy input
dummy_input = np.random.randn(1, 3, 80, 80).astype(np.float32)
out = session.run(None, {inputs[0].name: dummy_input})
print(f"Dummy output: {out}")
