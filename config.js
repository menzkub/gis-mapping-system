// ============================================================
//  config.js — Supabase client, row mappers, paginated loader
//  Loaded as a plain <script> before the Babel JSX files.
//
//  SETUP: Replace SUPABASE_URL and SUPABASE_ANON with the
//  values from your Supabase project → Settings → API.
// ============================================================

const SUPABASE_URL  = "https://yohlqjoogvuslemuwjij.supabase.co";
const SUPABASE_ANON = "sb_publishable_R6NaTaM5EGm1sVqtCgf2Ew_gN1zfdgC";

// supabase-js v2 is loaded via CDN before this script.
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
//  Row mappers:  DB (snake_case) ↔ App (UPPERCASE)
// ============================================================

function toMeter(row) {
  return {
    OBJECTID:   row.objectid,
    TAG:        row.tag        || "",
    CODE:       row.code       || "",
    ROUTE:      row.route      || "",
    ACCOUNTNUM: row.accountnum || "",
    PEANO:      row.peano      || "",
    FEEDERID:   row.feederid   || "",
    OWNER:      row.owner      || "PEA",
    INSTALLATI: row.installati || "",
    LATITUDE:   Number(row.latitude),
    LONGITUDE:  Number(row.longitude),
  };
}
function fromMeter(m) {
  return {
    objectid:   m.OBJECTID,
    tag:        m.TAG        || "",
    code:       m.CODE       || "",
    route:      m.ROUTE      || "",
    accountnum: m.ACCOUNTNUM || "",
    peano:      m.PEANO      || "",
    feederid:   m.FEEDERID   || "",
    owner:      m.OWNER      || "PEA",
    installati: m.INSTALLATI || "",
    latitude:   m.LATITUDE,
    longitude:  m.LONGITUDE,
  };
}

function toTransformer(row) {
  return {
    OBJECTID:      row.objectid,
    TAG:           row.tag           || "",
    PHASE:         row.phase         || "",
    VOLTAGE:       row.voltage       || "",
    PEANO_TR:      row.peano_tr      || "",
    INSTALL_PHASE: row.install_phase || "",
    KVA:           Number(row.kva),
    OWNER_TR:      row.owner_tr      || "PEA",
    LOCATION:      row.location      || "",
    FEEDER1:       row.feeder1       || "",
    LATITUDE:      Number(row.latitude),
    LONGITUDE:     Number(row.longitude),
    PEA_METER:     row.pea_meter     || "",
  };
}
function fromTransformer(t) {
  return {
    objectid:      t.OBJECTID,
    tag:           t.TAG            || "",
    phase:         t.PHASE          || "",
    voltage:       t.VOLTAGE        || "",
    peano_tr:      t.PEANO_TR       || "",
    install_phase: t.INSTALL_PHASE  || "",
    kva:           t.KVA            || 0,
    owner_tr:      t.OWNER_TR       || "PEA",
    location:      t.LOCATION       || "",
    feeder1:       t.FEEDER1        || "",
    latitude:      t.LATITUDE,
    longitude:     t.LONGITUDE,
    pea_meter:     t.PEA_METER      || "",
  };
}

function toProfile(row) {
  return {
    id:        row.id,
    username:  row.username  || "",
    name:      row.name      || "",
    email:     row.email     || "",
    role:      row.role      || "user",
    status:    row.status    || "pending",
    created:   row.created_at  ? row.created_at.slice(0, 10) : "",
    lastLogin: row.last_login  ? row.last_login.replace("T", " ").slice(0, 16) : "—",
  };
}
function fromProfilePatch(patch) {
  const out = {};
  if (patch.name   !== undefined) out.name   = patch.name;
  if (patch.role   !== undefined) out.role   = patch.role;
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.username !== undefined) out.username = patch.username;
  return out;
}

function toAuditEntry(row) {
  return {
    id:     String(row.id),
    at:     row.at ? row.at.replace("T", " ").slice(0, 19) : "",
    user:   row.username || "",
    action: row.action   || "",
    target: row.target   || "",
    detail: row.detail   || "",
    ip:     row.ip       || "",
  };
}

// ============================================================
//  loadAll — paginated fetch, bypasses 1000-row Supabase limit
// ============================================================
async function loadAll(table) {
  const PAGE = 1000;
  let from = 0;
  let all = [];
  while (true) {
    const { data, error } = await _supabase
      .from(table)
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

Object.assign(window, {
  _supabase,
  toMeter, fromMeter,
  toTransformer, fromTransformer,
  toProfile, fromProfilePatch,
  toAuditEntry,
  loadAll,
});
