import lightgbm as lgb
import numpy as np

# Load the model once
# Ensure triage_model.txt is in the same folder!
model = lgb.Booster(model_file='triage_model.txt')

def predict_triage(age, heart_rate, spo2, temperature):
    # Features must be in this exact order
    features = np.array([[age, heart_rate, spo2, temperature]], dtype=np.float32)
    
    # Get probabilities
    y_proba = model.predict(features)
    
    # Apply your custom logic from Colab
    if y_proba[0, 3] > 0.25:
        return 3
    else:
        return int(np.argmax(y_proba[0, :3]))