/**
 * RULE-BASED NLP PARSER - V1.2 STRICT (NATURAL INPUT)
 * Deterministic, offline, regex-based.
 * NO GUESSING. NO INFERENCE. NO CALCULATION.
 */

export const analyzeIntent = (text) => {
  const lower = text.toLowerCase().trim();

  // =========================
  // 1. QUANTITY (angka pertama)
  // =========================
  const qtyMatch = lower.match(/\d+/);
  const quantity_raw = qtyMatch ? parseInt(qtyMatch[0]) : null;

  // =========================
  // 2. TRANSPORT MODE HINT (explicit only)
  // =========================
  let transport_mode_hint = null;
  if (/(via|pakai)\s+laut|kapal|sea/.test(lower)) {
    transport_mode_hint = 'SEA';
  } else if (/(via|pakai)\s+darat|truk|land/.test(lower)) {
    transport_mode_hint = 'LAND';
  }

  // =========================
  // 3. DESTINATION CITY
  // =========================
  let destination_city = null;

  const destMatch = lower.match(
    /(ke|tujuan|arah)\s+([a-z\s]+)/i
  );

  if (destMatch) {
    destination_city = destMatch[2]
      .trim()
      .replace(/[.,;!?]+$/, '');
  }

  // =========================
  // 4. PRODUCT NAME RAW
  // =========================
  let product_name_raw = lower;

  // hapus quantity
  if (qtyMatch) {
    product_name_raw = product_name_raw.replace(qtyMatch[0], '');
  }

  // hapus destination part
  if (destMatch) {
    product_name_raw = product_name_raw.replace(destMatch[0], '');
  }

  // hapus kata umum (STOPWORDS ringan)
  product_name_raw = product_name_raw
    .replace(
      /\b(kalau|jika|kirim|dikirim|saya|mau|tolong|cek|biaya|ongkir|berapa|estimasi|unit|sebanyak|gimana|bagaimana|dong|ya|nih)\b/g,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();


  // =========================
  // RETURN SCHEMA V1.2
  // =========================
  return {
    product_name_raw: product_name_raw || null,
    quantity_raw,
    destination_city,
    transport_mode_hint
  };
};
