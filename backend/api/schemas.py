from marshmallow import Schema, fields, validate


class VictimIngestSchema(Schema):
    age = fields.Integer(required=True, validate=validate.Range(min=0, max=120))
    heart_rate = fields.Float(required=True, validate=validate.Range(min=20, max=300))
    spo2 = fields.Float(required=True, validate=validate.Range(min=50, max=100))
    temperature = fields.Float(required=True, validate=validate.Range(min=25, max=45))
    lat = fields.Float(required=True, validate=validate.Range(min=-90, max=90))
    lng = fields.Float(required=True, validate=validate.Range(min=-180, max=180))
    incident_id = fields.String(load_default="00000000-0000-0000-0000-000000000001")


class VictimIngestResponseSchema(Schema):
    status = fields.String()
    victim_id = fields.String()
    predicted_severity = fields.Integer()
    confidence = fields.Float()
    assigned_to = fields.String()


class VictimListResponseSchema(Schema):
    id = fields.String()
    age = fields.Integer()
    heart_rate = fields.Float()
    spo2 = fields.Float()
    temperature = fields.Float()
    triage_level = fields.Integer()
    confidence = fields.Float()
    lat = fields.Float()
    lng = fields.Float()
    timestamp = fields.String()
    status = fields.String()
    hospital_assigned = fields.String()
    incident_id = fields.String()
    discharged_at = fields.String(allow_none=True)


class PaginatedVictimsSchema(Schema):
    victims = fields.List(fields.Nested(VictimListResponseSchema))
    total = fields.Integer()
    page = fields.Integer()
    pages = fields.Integer()
    limit = fields.Integer()


class HospitalSchema(Schema):
    id = fields.Integer()
    name = fields.String()
    lat = fields.Float()
    lng = fields.Float()
    total_beds = fields.Integer()
    available_beds = fields.Integer()
    specialty = fields.String()
    eta_minutes = fields.Float(allow_none=True)
    distance_km = fields.Float(allow_none=True)


class AmbulanceSchema(Schema):
    id = fields.String()
    status = fields.String()
    location = fields.String()
    lat = fields.Float()
    lng = fields.Float()
    assigned_victim = fields.String(allow_none=True)


class ClusterSchema(Schema):
    id = fields.Integer()
    lat = fields.Float()
    lng = fields.Float()
    count = fields.Integer()
    avg_severity = fields.Float()
    radius = fields.Float()
    incident_id = fields.String()


class IncidentSchema(Schema):
    id = fields.String()
    name = fields.String()
    type = fields.String()
    status = fields.String()
    lat = fields.Float()
    lng = fields.Float()
    created_at = fields.String()


class LoginRequestSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=1))


class LoginResponseSchema(Schema):
    access_token = fields.String()
    role = fields.String()
    user_id = fields.String()


class RegisterRequestSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=2))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6))
    role = fields.String(required=True, validate=validate.OneOf(["victim", "responder", "admin"]))


class ErrorResponseSchema(Schema):
    error = fields.String()
    details = fields.List(fields.String(), load_default=[])


class RouteRequestSchema(Schema):
    lat = fields.Float(required=True)
    lng = fields.Float(required=True)
    radius_km = fields.Float(load_default=2.0, validate=validate.Range(min=0.1, max=50))
    incident_id = fields.String(load_default="00000000-0000-0000-0000-000000000001")


class RouteStepSchema(Schema):
    id = fields.String()
    lat = fields.Float()
    lng = fields.Float()
    triage_level = fields.Integer()
    distance_from_prev_km = fields.Float()


class RouteResponseSchema(Schema):
    route = fields.List(fields.Nested(RouteStepSchema))
    total_distance_km = fields.Float()
    victim_count = fields.Integer()


class VitalsUpdateSchema(Schema):
    heart_rate = fields.Float(required=True)
    spo2 = fields.Float(required=True)
    temperature = fields.Float(required=True)


class VitalsHistoryResponseSchema(Schema):
    victim_id = fields.Str()
    vitals_history = fields.List(fields.Dict())
    reopt_events = fields.List(fields.Dict())
