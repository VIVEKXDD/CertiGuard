/**
 * @fileOverview Certificate registry with hash chaining (blockchain style).
 * Includes canonical certificate hashing for consistent QR and Firestore signatures.
 */

import { createHash } from "crypto";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  writeBatch,
  updateDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase-config";
import { calculateCertificateHash } from "./pki";

/**
 * Certificate structure stored in Firestore.
 */
export interface CertificateRecord {
  id: string; // e.g., 'CERT-12345'
  studentName: string;
  course: string;
  issuingInstitution: string;
  grade: string;
  rollNumber: string;
  year: number;
  previousHash: string;
  hash: string;
  createdAt: any; // Firestore server timestamp
}

export interface VerificationLog {
  certificateId: string;
  status: 'Valid' | 'Partially Valid' | 'Invalid';
  reason: string;
  timestamp: any;
}

export interface BlacklistRecord {
    entityId: string;
    reason: string;
    status: 'active' | 'revoked';
    timestamp: any;
}


const certificatesCollection = collection(db, "certificates");
const verificationLogsCollection = collection(db, "verification_logs");
const blacklistCollection = collection(db, "blacklist");
const GENESIS_HASH = "0".repeat(64);

/**
 * Ensures the genesis block exists in Firestore.
 */
async function ensureGenesisBlock() {
  const q = query(certificatesCollection, orderBy("createdAt", "asc"), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    console.log("No records found. Creating genesis block...");
    const genesisRecordData = {
      id: "CERT-00000",
      studentName: "Genesis Block",
      course: "System Initialization",
      issuingInstitution: "CertGuard System",
      grade: "N/A",
      rollNumber: "N/A",
      year: new Date().getFullYear(),
    };
    // The genesis block's hash is based on its own content.
    const hash = calculateCertificateHash(genesisRecordData);
    const genesisRecord = {
      ...genesisRecordData,
      previousHash: GENESIS_HASH,
      hash,
      createdAt: serverTimestamp(),
    };
    await addDoc(certificatesCollection, genesisRecord);
    console.log("Genesis block created.");
  }
}

/**
 * Logs a verification attempt to Firestore.
 */
export async function logVerificationAttempt(logData: Omit<VerificationLog, 'timestamp'>): Promise<void> {
  await addDoc(verificationLogsCollection, {
    ...logData,
    timestamp: serverTimestamp(),
  });
}

/**
 * Retrieves the most recent forgery alerts (invalid verification attempts).
 */
export async function getForgeryAlerts(alertLimit: number = 5): Promise<VerificationLog[]> {
  const q = query(
    verificationLogsCollection,
    where("status", "==", "Invalid"),
    orderBy("timestamp", "desc"),
    limit(alertLimit)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as VerificationLog);
}


/**
 * Resets the chain to its initial genesis state by deleting all records.
 */
export async function resetChain(): Promise<{ message: string }> {
  const snapshot = await getDocs(certificatesCollection);
  if (snapshot.size === 0) {
    await ensureGenesisBlock();
    return { message: "Chain was already empty. Initialized genesis block." };
  }
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log("All certificate records deleted.");
  await ensureGenesisBlock();
  return { message: "Certificate chain has been reset to its genesis state." };
}

/**
 * Retrieves a certificate record by its ID.
 * The hash returned here IS the authoritative signature from the registry.
 */
export async function getCertificateById(
  certificateId: string
): Promise<CertificateRecord | null> {
  const q = query(
    certificatesCollection,
    where("id", "==", certificateId),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  // Return the raw data from Firestore. The `hash` field on this object
  // is the authoritative signature we must compare against.
  return snapshot.docs[0].data() as CertificateRecord;
}


/**
 * Adds a new certificate to the registry, linking it to the previous one.
 */
export async function addCertificate(
  recordData: Omit<CertificateRecord, "hash" | "previousHash" | "createdAt">
): Promise<CertificateRecord> {
  // Get last record to establish the chain link
  const q = query(certificatesCollection, orderBy("createdAt", "desc"), limit(1));
  const lastDocSnapshot = await getDocs(q);

  let previousHash = GENESIS_HASH;
  if (!lastDocSnapshot.empty) {
    // The previous hash is the *entire hash* of the previous block, not its content.
    previousHash = lastDocSnapshot.docs[0].data().hash;
  } else {
    // If the chain is empty, ensure the genesis block is created first.
    await ensureGenesisBlock();
    const freshLastDocSnapshot = await getDocs(q);
    if (!freshLastDocSnapshot.empty) {
      previousHash = freshLastDocSnapshot.docs[0].data().hash;
    }
  }
  
  // This is the authoritative signature for the certificate's content.
  // It is calculated ONLY from the core certificate data.
  const signatureHash = calculateCertificateHash({
    id: recordData.id,
    studentName: recordData.studentName,
    course: recordData.course,
    issuingInstitution: recordData.issuingInstitution,
    grade: recordData.grade,
    rollNumber: recordData.rollNumber,
    year: recordData.year,
  });

  const newRecordData = {
    ...recordData,
    previousHash, // This links the blocks in the chain.
    hash: signatureHash, // This hash represents the content signature.
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(certificatesCollection, newRecordData);
  const docSnap = await getDoc(docRef);

  return docSnap.data() as CertificateRecord;
}


/**
 * Verifies the integrity of the entire certificate chain.
 */
export async function verifyChainIntegrity(): Promise<{
  isValid: boolean;
  log: string[];
}> {
  const log: string[] = [];
  let isValid = true;

  const q = query(certificatesCollection, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  const certificateChain = snapshot.docs.map(
    (d) => d.data() as CertificateRecord
  );

  if (certificateChain.length === 0) {
    log.push("Chain is empty or not initialized.");
    await ensureGenesisBlock();
    log.push("Initialized a new genesis block.");
    return { isValid: true, log };
  }
  
  let expectedPreviousHash = GENESIS_HASH;

  for (let i = 0; i < certificateChain.length; i++) {
    const currentRecord = certificateChain[i];
    log.push(`Verifying record: ${currentRecord.id}...`);

    // Check chain link integrity
    if (currentRecord.previousHash !== expectedPreviousHash) {
       log.push(`-> FAIL: Chain broken at record ${currentRecord.id}. Expected previous hash ${expectedPreviousHash.slice(0, 10)}... but got ${currentRecord.previousHash.slice(0, 10)}...`);
       isValid = false;
    } else {
        log.push(`-> OK: Previous hash link valid.`);
    }

    // Check content integrity
    const recalculatedContentHash = calculateCertificateHash(currentRecord);
    if (currentRecord.hash !== recalculatedContentHash) {
      log.push(`-> FAIL: Tampering detected at ${currentRecord.id}. Content hash mismatch.`);
      isValid = false;
    } else {
      log.push(`-> OK: Record content hash valid.`);
    }
    
    // For the next iteration, the expected previous hash is the hash of the current record's content.
    expectedPreviousHash = currentRecord.hash;
  }


  if (isValid) {
    log.push("\nSUCCESS: Chain integrity verified. All records are valid.");
  } else {
    log.push("\nCRITICAL: Chain integrity compromised.");
  }

  return { isValid, log };
}

/**
 * Simulates tampering with a random record.
 */
export async function tamperWithChain(): Promise<{ message: string }> {
  const q = query(certificatesCollection, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);

  if (snapshot.size < 2) {
    return { message: "Not enough records to tamper." };
  }

  const tamperIndex = Math.floor(Math.random() * (snapshot.size - 1)) + 1;
  const docToTamper = snapshot.docs[tamperIndex];

  await updateDoc(doc(db, "certificates", docToTamper.id), {
    studentName: `${docToTamper.data().studentName} (Tampered)`,
  });

  return { message: `Tampered with record ID: ${docToTamper.data().id}` };
}

/**
 * Adds an entity to the blacklist.
 */
export async function addEntityToBlacklist(entityId: string, reason: string): Promise<void> {
  const existingQuery = query(
    blacklistCollection,
    where("entityId", "==", entityId),
    where("status", "==", "active")
  );
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    throw new Error("This entity is already blacklisted.");
  }
  
  await addDoc(blacklistCollection, {
    entityId,
    reason,
    status: 'active',
    timestamp: serverTimestamp(),
  });
}

/**
 * Checks if an entity is currently blacklisted.
 */
export async function isEntityBlacklisted(entityId: string): Promise<boolean> {
  const q = query(
    blacklistCollection,
    where("entityId", "==", entityId),
    where("status", "==", "active"),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}
