#!/usr/bin/env python3
"""Verify and extract official ENSANUT archives without redistributing data."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent
DEFAULT_MANIFEST = PROJECT_DIR / "config" / "data_manifest.json"
DEFAULT_DATA_DIR = PROJECT_DIR / "data" / "raw"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_extract_member(archive: zipfile.ZipFile, member: str, target_dir: Path) -> Path:
    member_path = Path(member)
    if member_path.is_absolute() or ".." in member_path.parts:
        raise ValueError(f"Ruta insegura dentro del ZIP: {member}")

    target = target_dir / member_path.name
    target.parent.mkdir(parents=True, exist_ok=True)
    with archive.open(member) as source, target.open("wb") as destination:
        shutil.copyfileobj(source, destination)
    return target


def prepare(
    archives_dir: Path,
    data_dir: Path,
    manifest_path: Path,
    selected_waves: set[str] | None = None,
    allow_checksum_mismatch: bool = False,
) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    provenance: dict[str, object] = {
        "schema_version": 1,
        "prepared_at_utc": datetime.now(timezone.utc).isoformat(),
        "manifest": str(manifest_path),
        "waves": {},
    }

    for wave, wave_spec in manifest["waves"].items():
        if selected_waves and wave not in selected_waves:
            continue

        wave_dir = data_dir / wave
        wave_dir.mkdir(parents=True, exist_ok=True)
        archive_records = []

        for archive_spec in wave_spec["archives"]:
            archive_path = archives_dir / archive_spec["filename"]
            if not archive_path.exists():
                raise FileNotFoundError(
                    f"Falta {archive_path}. Descárgalo desde {wave_spec['landing_page']}"
                )

            observed_hash = sha256(archive_path)
            expected_hash = archive_spec["sha256"]
            if observed_hash != expected_hash and not allow_checksum_mismatch:
                raise ValueError(
                    f"SHA-256 inesperado para {archive_path.name}: {observed_hash}; "
                    f"esperado: {expected_hash}"
                )

            with zipfile.ZipFile(archive_path) as archive:
                available = set(archive.namelist())
                missing = set(archive_spec["required_members"]) - available
                if missing:
                    raise ValueError(
                        f"{archive_path.name} no contiene: {', '.join(sorted(missing))}"
                    )
                extracted_hashes = {}
                for member in archive_spec["required_members"]:
                    extracted = safe_extract_member(archive, member, wave_dir)
                    extracted_hashes[extracted.name] = sha256(extracted)

            archive_records.append(
                {
                    "filename": archive_path.name,
                    "sha256": observed_hash,
                    "checksum_matches_manifest": observed_hash == expected_hash,
                    "members": archive_spec["required_members"],
                    "extracted_sha256": extracted_hashes,
                }
            )

        provenance["waves"][wave] = {
            "landing_page": wave_spec["landing_page"],
            "archives": archive_records,
        }

    data_dir.mkdir(parents=True, exist_ok=True)
    provenance_path = data_dir / "provenance.json"
    provenance_path.write_text(
        json.dumps(provenance, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return provenance


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verifica y extrae los ZIP oficiales de ENSANUT."
    )
    parser.add_argument("--archives-dir", type=Path, required=True)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument(
        "--waves",
        nargs="+",
        choices=("2012", "2016", "2018", "2021"),
        help="Olas a preparar; por defecto prepara todas.",
    )
    parser.add_argument(
        "--allow-checksum-mismatch",
        action="store_true",
        help="Permite archivos oficiales revisados, dejando constancia en provenance.json.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        provenance = prepare(
            archives_dir=args.archives_dir.resolve(),
            data_dir=args.data_dir.resolve(),
            manifest_path=args.manifest.resolve(),
            selected_waves=set(args.waves) if args.waves else None,
            allow_checksum_mismatch=args.allow_checksum_mismatch,
        )
    except (FileNotFoundError, ValueError, zipfile.BadZipFile) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    prepared = ", ".join(provenance["waves"].keys())
    print(f"ENSANUT preparado correctamente: {prepared}")
    print(f"Microdatos: {args.data_dir.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
