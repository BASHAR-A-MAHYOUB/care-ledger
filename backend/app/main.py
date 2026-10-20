import os
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(
    title="Healthcare Ledger API",
    description="Academic demo API. Uses an in-memory mock ledger, not a live Fabric network.",
    version="0.1.0",
)
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"], allow_headers=["Content-Type"]
)

# In-memory data is for a classroom demo only. Restarting the server clears it.
records = {}
permissions = {}
audit = []

def log_event(action: str, actor: str, record_ref: str, detail: str = ""):
    audit.insert(0, {
        "event_id": "evt_" + secrets.token_hex(4),
        "action": action,
        "actor": actor,
        "record_ref": record_ref,
        "detail": detail,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

def seed_initial_data():
    sample_records = [
        {
            "record_ref": "rec_cardio_981a",
            "patient_ref": "PAT-88219",
            "clinician": "Dr. Sarah Sharma (Cardiology)",
            "record_type": "Lab result",
            "content": "Comprehensive Lipid Panel: Total Cholesterol: 185 mg/dL, HDL: 54 mg/dL, LDL: 108 mg/dL, Triglycerides: 112 mg/dL. Fasting Blood Glucose: 92 mg/dL. Patient is clinically stable under current protocol.",
            "created_at": "2026-10-20T10:15:30.000Z",
            "status": "Encrypted off-chain; digest anchored in ledger"
        },
        {
            "record_ref": "rec_img_7721",
            "patient_ref": "PAT-88219",
            "clinician": "Dr. Robert Vance (Radiology)",
            "record_type": "Imaging reference",
            "content": "DICOM Series Reference #IMG-99042: Contrast MRI Lumbar Spine L1-L5. Mild desiccation at L4-L5 disc space without acute canal impingement or cord compression.",
            "created_at": "2026-10-20T14:40:12.000Z",
            "status": "Encrypted off-chain; digest anchored in ledger"
        },
        {
            "record_ref": "rec_presc_3304",
            "patient_ref": "PAT-44102",
            "clinician": "Dr. Emily Chen (Internal Medicine)",
            "record_type": "Prescription",
            "content": "Rx: Metformin HCl 500mg PO BID with meals. Supply: 90 days. Dispensed by Metro Health Central Pharmacy. Refills: 3.",
            "created_at": "2026-10-21T01:20:00.000Z",
            "status": "Encrypted off-chain; digest anchored in ledger"
        }
    ]
    for r in sample_records:
        digest = hashlib.sha256(r["content"].encode("utf-8")).hexdigest()
        records[r["record_ref"]] = {
            **r,
            "content_digest": digest,
        }
        audit.append({
            "event_id": "evt_" + secrets.token_hex(4),
            "action": "RECORD_REGISTERED",
            "actor": r["clinician"],
            "record_ref": r["record_ref"],
            "detail": f"Cryptographic digest {digest[:16]}… anchored in mock ledger",
            "timestamp": r["created_at"]
        })
    
    # Initial sample permissions
    permissions[("rec_cardio_981a", "Dr. Example")] = {
        "granted_by": "PAT-88219",
        "purpose": "Cardiology consultation and surgical pre-op clearance",
        "granted_at": "2026-10-20T11:00:00.000Z",
        "active": True
    }
    audit.insert(0, {
        "event_id": "evt_" + secrets.token_hex(4),
        "action": "ACCESS_GRANTED",
        "actor": "PAT-88219",
        "record_ref": "rec_cardio_981a",
        "detail": "doctor=Dr. Example; purpose=Cardiology consultation and surgical pre-op clearance",
        "timestamp": "2026-10-20T11:00:00.000Z"
    })
    
    permissions[("rec_img_7721", "Dr. Example")] = {
        "granted_by": "PAT-88219",
        "purpose": "Radiology second opinion consult",
        "granted_at": "2026-10-20T15:00:00.000Z",
        "active": False
    }
    audit.insert(0, {
        "event_id": "evt_" + secrets.token_hex(4),
        "action": "ACCESS_REVOKED",
        "actor": "PAT-88219",
        "record_ref": "rec_img_7721",
        "detail": "doctor=Dr. Example; previous consent expired/revoked",
        "timestamp": "2026-10-20T18:30:00.000Z"
    })

seed_initial_data()

class RecordCreate(BaseModel):
    patient_ref: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    clinician: str = Field(min_length=2, max_length=80)
    record_type: Literal["Lab result", "Prescription", "Clinical note", "Imaging reference"]
    content: str = Field(min_length=1, max_length=10000, description="Dummy content only; production must encrypt before storage.")

class AccessGrant(BaseModel):
    doctor_id: str = Field(min_length=2, max_length=80)
    granted_by: str = Field(min_length=2, max_length=80)
    purpose: str = Field(min_length=3, max_length=200)

class AccessCheck(BaseModel):
    doctor_id: str = Field(min_length=2, max_length=80)

@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "mock-ledger", "fabric_connected": False}

@app.get("/api/records")
def list_records():
    # Demo list omits raw content. A real service must enforce user-specific authorization.
    return [
        {k: v for k, v in record.items() if k != "content"}
        for record in records.values()
    ]

@app.get("/api/records/{record_ref}")
def get_record(record_ref: str, doctor_id: str | None = None):
    record = records.get(record_ref)
    if not record:
        raise HTTPException(404, "Unknown record reference")
    if doctor_id:
        grant = permissions.get((record_ref, doctor_id))
        if not (grant and grant.get("active")):
            log_event("ACCESS_DENIED", doctor_id, record_ref, "Access denied: No active consent grant")
            raise HTTPException(403, "Access denied: No active consent grant found for this clinician ID")
        log_event("RECORD_ACCESSED", doctor_id, record_ref, f"Authorized view under purpose: {grant.get('purpose', 'Care review')}")
        return record
    return {k: v for k, v in record.items() if k != "content"}

@app.post("/api/records")
def create_record(body: RecordCreate):
    record_ref = "rec_" + secrets.token_hex(6)
    digest = hashlib.sha256(body.content.encode("utf-8")).hexdigest()
    # Demo only: content is in memory as plain text. Never use real medical data here.
    records[record_ref] = {
        "record_ref": record_ref,
        "patient_ref": body.patient_ref,
        "clinician": body.clinician,
        "record_type": body.record_type,
        "content": body.content,
        "content_digest": digest,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "Stored in demo memory; not encrypted"
    }
    log_event("RECORD_REGISTERED", body.clinician, record_ref, "Digest anchored in mock ledger")
    return {k: v for k, v in records[record_ref].items() if k != "content"}

@app.get("/api/permissions")
def list_permissions():
    return [
        {
            "record_ref": rec_ref,
            "doctor_id": doc_id,
            "granted_by": data.get("granted_by", "patient"),
            "purpose": data.get("purpose", ""),
            "granted_at": data.get("granted_at", ""),
            "active": data.get("active", False)
        }
        for (rec_ref, doc_id), data in permissions.items()
    ]

@app.post("/api/records/{record_ref}/grant")
def grant_access(record_ref: str, body: AccessGrant):
    if record_ref not in records:
        raise HTTPException(404, "Unknown record reference")
    permissions[(record_ref, body.doctor_id)] = {
        "granted_by": body.granted_by,
        "purpose": body.purpose,
        "granted_at": datetime.now(timezone.utc).isoformat(),
        "active": True
    }
    log_event("ACCESS_GRANTED", body.granted_by, record_ref, f"doctor={body.doctor_id}; purpose={body.purpose}")
    return {"record_ref": record_ref, "doctor_id": body.doctor_id, "active": True}

@app.post("/api/records/{record_ref}/revoke")
def revoke_access(record_ref: str, body: AccessCheck):
    key = (record_ref, body.doctor_id)
    if key not in permissions or not permissions[key]["active"]:
        raise HTTPException(404, "No active grant found")
    permissions[key]["active"] = False
    log_event("ACCESS_REVOKED", "demo-patient", record_ref, f"doctor={body.doctor_id}")
    return {"record_ref": record_ref, "doctor_id": body.doctor_id, "active": False}

@app.post("/api/records/{record_ref}/check-access")
def check_access(record_ref: str, body: AccessCheck):
    if record_ref not in records:
        raise HTTPException(404, "Unknown record reference")
    grant = permissions.get((record_ref, body.doctor_id))
    allowed = bool(grant and grant["active"])
    log_event("ACCESS_CHECKED", body.doctor_id, record_ref, f"allowed={allowed}")
    return {"record_ref": record_ref, "doctor_id": body.doctor_id, "allowed": allowed}

@app.get("/api/audit")
def get_audit():
    return audit[:100]

@app.get("/api/records/{record_ref}/verify")
def verify_record(record_ref: str):
    record = records.get(record_ref)
    if not record:
        raise HTTPException(404, "Unknown record reference")
    current = hashlib.sha256(record["content"].encode("utf-8")).hexdigest()
    is_ok = current == record["content_digest"]
    if is_ok:
        log_event("INTEGRITY_VERIFIED", "LedgerVerifier", record_ref, "Digest verified against on-chain anchor: tamper-free")
    else:
        log_event("TAMPER_DETECTED", "LedgerVerifier", record_ref, f"Digest mismatch! Off-chain data altered: {current[:12]}... != {record['content_digest'][:12]}...")
    return {
        "record_ref": record_ref,
        "stored_digest": record["content_digest"],
        "current_digest": current,
        "integrity_ok": is_ok,
        "is_tampered": bool("original_content" in record)
    }

@app.post("/api/records/{record_ref}/simulate-tamper")
def simulate_tamper(record_ref: str):
    record = records.get(record_ref)
    if not record:
        raise HTTPException(404, "Unknown record reference")
    if "original_content" not in record:
        record["original_content"] = record["content"]
    record["content"] = record["content"] + " [UNAUTHORIZED_OFFCHAIN_TAMPER: altered dosages/values]"
    log_event("TAMPER_SIMULATED", "AdversarySimulator", record_ref, "Simulated direct unauthorized alteration of off-chain database record")
    return {"record_ref": record_ref, "tampered": True}

@app.post("/api/records/{record_ref}/restore-tamper")
def restore_tamper(record_ref: str):
    record = records.get(record_ref)
    if not record:
        raise HTTPException(404, "Unknown record reference")
    if "original_content" in record:
        record["content"] = record["original_content"]
        del record["original_content"]
    log_event("TAMPER_RESTORED", "SecurityAdmin", record_ref, "Restored authentic encrypted record from backup")
    return {"record_ref": record_ref, "restored": True}
