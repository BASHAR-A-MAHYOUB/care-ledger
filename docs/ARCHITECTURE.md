# Architecture and Data Flow

## Components
1. React UI: user-facing patient/clinician workflow.
2. FastAPI: validates requests and enforces application policies.
3. Encrypted off-chain storage: actual clinical content (not implemented in this demo).
4. Hyperledger Fabric: permissioned ledger for opaque record references, consent changes, integrity digests, and audit events (mocked in this demo).
5. Identity provider: production should use verified organisational identities and certificates.

## Create record flow
Clinician UI -> API authentication/authorization -> encrypt record -> store ciphertext off-chain -> submit opaque reference + digest to Fabric -> return receipt.

## Access flow
Doctor request -> verify identity -> verify active consent/purpose -> log access event -> retrieve ciphertext -> decrypt only for authorised recipient.

## Privacy caveats
A digest, timestamp, patient reference, or access event can still be personal or linkable data. Minimise metadata and assess applicable local law. Do not put raw health information on-chain.
