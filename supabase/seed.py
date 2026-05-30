#!/usr/bin/env python3
"""
Generate seed.sql from PEA CSV files.
Usage:  python3 supabase/seed.py > supabase/seed.sql
Then paste seed.sql into the Supabase SQL editor and run it.
"""
import csv, os, sys

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'project')

def esc(v):
    return "'" + str(v).replace("'", "''") + "'"

def num(v, default=0):
    try:
        s = str(v).strip()
        return float(s) if s else default
    except (ValueError, TypeError):
        return default

# ---- meters ----------------------------------------------------------------
meter_path = os.path.join(BASE, 'PEA_Meter.csv')
print("-- meters", file=sys.stderr)

rows = []
with open(meter_path, encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        rows.append(r)

print(f"-- {len(rows)} meter rows")
print("insert into public.meters "
      "(objectid,tag,code,route,accountnum,peano,feederid,owner,installati,latitude,longitude)")
print("values")

parts = []
for r in rows:
    parts.append(
        f"  ({int(float(r['OBJECTID']))},"
        f"{esc(r.get('TAG',''))},"
        f"{esc(r.get('CODE',''))},"
        f"{esc(r.get('ROUTE',''))},"
        f"{esc(r.get('ACCOUNTNUM',''))},"
        f"{esc(r.get('PEANO',''))},"
        f"{esc(r.get('FEEDERID',''))},"
        f"{esc(r.get('OWNER','PEA'))},"
        f"{esc(r.get('INSTALLATI',''))},"
        f"{num(r.get('LATITUDE',0))},"
        f"{num(r.get('LONGITUDE',0))})"
    )

print(',\n'.join(parts))
print("on conflict (objectid) do nothing;")
print()

# ---- transformers ----------------------------------------------------------
tr_path = os.path.join(BASE, 'PEA_TR.csv')
print("-- transformers", file=sys.stderr)

rows = []
with open(tr_path, encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        rows.append(r)

print(f"-- {len(rows)} transformer rows")
print("insert into public.transformers "
      "(objectid,tag,phase,voltage,peano_tr,install_phase,kva,owner_tr,location,feeder1,latitude,longitude,pea_meter)")
print("values")

parts = []
for r in rows:
    parts.append(
        f"  ({int(float(r['OBJECTID']))},"
        f"{esc(r.get('TAG',''))},"
        f"{esc(r.get('ระบบเฟส',''))},"
        f"{esc(r.get('ระดับแรงดัน',''))},"
        f"{esc(r.get('PEANO หม้อแปลง',''))},"
        f"{esc(r.get('เฟสที่ติดตั้ง',''))},"
        f"{num(r.get('ค่าพิกัด kVA หม้อแปลง','0'))},"
        f"{esc(r.get('เจ้าของหม้อแปลง','PEA'))},"
        f"{esc(r.get('สถานที่',''))},"
        f"{esc(r.get('รหัสสายป้อนที่ 1',''))},"
        f"{num(r.get('LATITUDE',0))},"
        f"{num(r.get('LONGITUDE',0))},"
        f"{esc(r.get('PEA Meter',''))})"
    )

print(',\n'.join(parts))
print("on conflict (objectid) do nothing;")
