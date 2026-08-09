import onnxruntime as ort
try:
    session = ort.InferenceSession("core/models/silent_face.onnx", providers=["CPUExecutionProvider"])
    print("Loaded ONNX successfully. Inputs:", [i.name for i in session.get_inputs()], "Outputs:", [o.name for o in session.get_outputs()])
except Exception as e:
    print("Failed to load:", e)
