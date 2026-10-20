# Blockchain-Based Healthcare Data Management System

Academic capstone project implementing a **Permissioned Healthcare Consortium Architecture** using Hyperledger Fabric concepts, React 18, FastAPI, and off-chain encrypted storage design.

> 📄 **Academic Report Generator**: To generate a complete 20–30 page academic project report, thesis chapter, or seminar documentation using ChatGPT, open and copy [`docs/FULL_PROJECT_REPORT_SPECIFICATION.md`](docs/FULL_PROJECT_REPORT_SPECIFICATION.md). It contains the complete technical specification, architecture diagrams, test results, and ready-to-run master prompt.

---

## Key Highlights & Features
- **Multi-Page Workspace Navigation**: Full routing between System Overview, Medical Records, Access Control, and Audit Trail.
- **Good Mood Design System**: 4 uplifting color palettes (🌿 *Mint Serenity*, ☀️ *Sunrise Coral*, 🌊 *Azure Breeze*, 🌸 *Lavender Dream*) with instant Dark/Light mode switching.
- **Interactive Guided Sandbox**: 1-click test scenarios demonstrating authorized decryption, unauthorized access denial, and SHA-256 integrity verification.
- **Doctor Decryption Gate Simulator**: Demonstrates smart contract consent evaluation releasing off-chain clinical notes with simulated AES-256-GCM decryption.
- **Live Cryptographic Digest Computation**: Real-time SHA-256 preview using client-side Web Crypto API.
- **Immutable Ledger Audit Trail**: Chronological event sequence with raw block transaction envelope inspector (JSON) and JSON/CSV export.

## Core Privacy Architecture
- Do not put names, diagnoses, prescriptions, scans, or raw medical records on a public blockchain.
- Keep medical documents encrypted off-chain.
- The ledger stores opaque record references, integrity digests, consent/access state, and audit events.
- Use role-based access and verify consent before disclosing a record.
- Hashes and metadata can still be sensitive or linkable; dummy patient data is used for this demonstration.

## Technology Stack
- **Frontend**: React 18 + Vite 6 + TypeScript + Lucide Icons + Custom CSS Design System
- **Backend**: FastAPI + Python 3.13 + Uvicorn + Pydantic v2
- **Blockchain**: Hyperledger Fabric architecture model (Chaincode specifications + local mock ledger adapter)
- **Data Store**: Off-chain encrypted storage (PostgreSQL compatible design)
- **Cryptography**: SHA-256 cryptographic digests & AES-256-GCM design pattern

## Repository
- `backend/`: API starter with mock ledger adapter for local UI testing
- `frontend/`: React dashboard
- `chaincode/`: Fabric chaincode design notes and sample Go contract skeleton
- `docs/`: workflow, privacy model, and test plan

## Run backend (Windows PowerShell)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```
Open http://127.0.0.1:8000/docs

## Run frontend (second terminal)
```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```
Open the Vite URL shown in terminal.

## Important implementation note
The included backend is an educational mock-ledger prototype so the frontend can be demonstrated before a Fabric test network is configured. It is NOT connected to a live Hyperledger Fabric network. The chaincode folder documents the intended ledger interface. For a real Fabric integration, run the official Fabric test network and connect the backend using Fabric Gateway SDK and enrolment identities.

## Demo flow
1. Open the dashboard and create a dummy patient record reference.
2. Grant a doctor access to the reference.
3. Check access as the authorised doctor.
4. Revoke access.
5. View the audit events.
6. Compare the stored content digest to verify integrity.

## Privacy and compliance
This prototype supports privacy-oriented design patterns, but does not certify legal compliance. Applicable requirements depend on the jurisdiction and institution. Production use requires a privacy impact assessment, threat modelling, key management, retention/deletion policy, consent policy, audit controls, and security review.
