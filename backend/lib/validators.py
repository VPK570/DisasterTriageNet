import re


def validate_vitals(data):
    errors = []

    age = data.get('age')
    if age is not None:
        try:
            age = int(age)
            if age < 0 or age > 120:
                errors.append("age must be between 0 and 120")
        except (TypeError, ValueError):
            errors.append("age must be a valid integer")
    else:
        errors.append("age is required")

    hr = data.get('heart_rate')
    if hr is not None:
        try:
            hr = float(hr)
            if hr < 20 or hr > 300:
                errors.append("heart_rate must be between 20 and 300 BPM")
        except (TypeError, ValueError):
            errors.append("heart_rate must be a valid number")
    else:
        errors.append("heart_rate is required")

    spo2 = data.get('spo2')
    if spo2 is not None:
        try:
            spo2 = float(spo2)
            if spo2 < 50 or spo2 > 100:
                errors.append("spo2 must be between 50 and 100%")
        except (TypeError, ValueError):
            errors.append("spo2 must be a valid number")
    else:
        errors.append("spo2 is required")

    temp = data.get('temperature')
    if temp is not None:
        try:
            temp = float(temp)
            if temp < 25 or temp > 45:
                errors.append("temperature must be between 25 and 45 C")
        except (TypeError, ValueError):
            errors.append("temperature must be a valid number")
    else:
        errors.append("temperature is required")

    lat = data.get('lat')
    if lat is not None:
        try:
            lat = float(lat)
            if lat < -90 or lat > 90:
                errors.append("lat must be between -90 and 90")
        except (TypeError, ValueError):
            errors.append("lat must be a valid number")
    else:
        errors.append("lat is required")

    lng = data.get('lng')
    if lng is not None:
        try:
            lng = float(lng)
            if lng < -180 or lng > 180:
                errors.append("lng must be between -180 and 180")
        except (TypeError, ValueError):
            errors.append("lng must be a valid number")
    else:
        errors.append("lng is required")

    return errors


def validate_vitals_update(data):
    errors = []

    hr = data.get('heart_rate')
    if hr is not None:
        try:
            hr = float(hr)
            if hr < 20 or hr > 300:
                errors.append("heart_rate must be between 20 and 300 BPM")
        except (TypeError, ValueError):
            errors.append("heart_rate must be a valid number")
    else:
        errors.append("heart_rate is required")

    spo2 = data.get('spo2')
    if spo2 is not None:
        try:
            spo2 = float(spo2)
            if spo2 < 50 or spo2 > 100:
                errors.append("spo2 must be between 50 and 100%")
        except (TypeError, ValueError):
            errors.append("spo2 must be a valid number")
    else:
        errors.append("spo2 is required")

    temp = data.get('temperature')
    if temp is not None:
        try:
            temp = float(temp)
            if temp < 25 or temp > 45:
                errors.append("temperature must be between 25 and 45 C")
        except (TypeError, ValueError):
            errors.append("temperature must be a valid number")
    else:
        errors.append("temperature is required")

    return errors


def validate_email(email):
    if not email or not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return "Invalid email format"
    return None


def validate_password(password):
    if not password or len(password) < 6:
        return "Password must be at least 6 characters"
    return None
