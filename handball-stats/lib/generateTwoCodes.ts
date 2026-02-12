import crypto from "crypto";

// Génère un code alphanumérique sécurisé de longueur max 12 (pour @db.VarChar(12))
function generateSecureCode(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sans O, 0, I, 1, l
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

// Génère deux codes distincts
export function generateTwoCodes() {
  let code1 = generateSecureCode();
  let code2;
  do {
    code2 = generateSecureCode();
  } while (code2 === code1);
  return { coachCode: code1, playerCode: code2 };
}
