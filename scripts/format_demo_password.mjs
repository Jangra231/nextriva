import { randomBytes, scryptSync } from "node:crypto";

const password = "FitizenDemo!2026";
const salt = randomBytes(16).toString("hex");
console.log(`${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
