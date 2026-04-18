import lightgbm as lgb
import numpy as np
import shap

model = lgb.Booster(model_file='core/triage_model.txt')

FEATURE_NAMES = ['age', 'heart_rate', 'spo2', 'temperature']

TEMPERATURE = 1.0

_explainer = None

def _get_explainer():
    global _explainer
    if _explainer is None:
        _explainer = shap.TreeExplainer(model)
    return _explainer

def predict_triage(age, heart_rate, spo2, temperature):
    features = np.array([[age, heart_rate, spo2, temperature]], dtype=np.float32)
    
    y_proba = model.predict(features)[0]
    
    calibrated = np.exp(np.log(y_proba + 1e-10) / TEMPERATURE)
    calibrated = calibrated / calibrated.sum()
    
    confidence = float(np.max(calibrated))
    
    if calibrated[3] > 0.25:
        severity = 3
    else:
        severity = int(np.argmax(calibrated[:3]))
    
    return severity, confidence, calibrated.tolist()

def get_explanation(age, heart_rate, spo2, temperature):
    features = np.array([[age, heart_rate, spo2, temperature]], dtype=np.float32)
    explainer = _get_explainer()
    shap_values = explainer.shap_values(features)
    
    if isinstance(shap_values, list):
        shap_values = np.array(shap_values)
        shap_values = shap_values[:, 0, :]
    
    feature_importance = []
    for i, name in enumerate(FEATURE_NAMES):
        mean_abs_shap = float(np.mean(np.abs(shap_values[:, i])))
        raw_shap = float(shap_values[0, i])
        feature_importance.append({
            'feature': name,
            'value': features[0, i],
            'shap_value': round(raw_shap, 4),
            'impact': round(mean_abs_shap, 4),
        })
    
    feature_importance.sort(key=lambda x: abs(x['shap_value']), reverse=True)
    
    return feature_importance
