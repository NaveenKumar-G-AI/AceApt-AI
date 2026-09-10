export const newId = (prefix = "id") => `${prefix}_${crypto.randomUUID()}`;
export const nowIso = () => new Date().toISOString();
