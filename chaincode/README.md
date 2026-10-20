# Hyperledger Fabric Chaincode Integration Notes

The API in this starter is deliberately a mock ledger. To integrate with Fabric:
1. Start the official Hyperledger Fabric test network with Certificate Authorities.
2. Define MSP identities and organisation-level access policies.
3. Implement chaincode functions such as `RegisterRecordReference`, `GrantAccess`, `RevokeAccess`, `CheckConsent`, and `AppendAuditEvent`.
4. Keep clinical content encrypted and off-chain; use private data collections only for carefully selected metadata if required.
5. Connect FastAPI through the Hyperledger Fabric Gateway SDK and use enrolled identities, not user-supplied role strings.
6. Test endorsement policies, certificate revocation, private data dissemination, replay protection, and audit access.

Do not treat this document as deployed chaincode or claim that the demo is already connected to Fabric.
