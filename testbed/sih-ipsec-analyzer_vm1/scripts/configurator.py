import argparse
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.experiment.validator import validate


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "config" / "configuration.yaml"


def parse_bool(value: str) -> bool:
    value = value.lower()

    if value in {"true", "yes", "1"}:
        return True

    if value in {"false", "no", "0"}:
        return False

    raise argparse.ArgumentTypeError(
        "PFS must be true or false."
    )


def create_configuration(args) -> dict:
    configuration = {
        "ipsec_mode": args.ipsec_mode,
        "encryption": args.encryption,
        "integrity": args.integrity,
        "dh_group": args.dh_group,
        "pfs": args.pfs,
        "ip_version": args.ip_version,
        "traffic_type": args.traffic_type,
    }

    errors = validate(configuration)

    if errors:
        raise ValueError(
            "Invalid configuration:\n"
            + "\n".join(
                f"- {error}" for error in errors
            )
        )

    return configuration


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Create a validated IPsec experiment "
            "configuration YAML."
        )
    )

    parser.add_argument(
        "--ipsec-mode",
        choices=["transport", "tunnel"],
        default="transport",
    )

    parser.add_argument(
        "--encryption",
        choices=[
            "aes128-cbc",
            "aes256-cbc",
            "aes128-gcm16",
            "aes256-gcm16",
        ],
        default="aes128-gcm16",
    )

    parser.add_argument(
        "--integrity",
        choices=[
            "sha256",
            "sha384",
            "sha512",
            "none-aead",
        ],
        default="none-aead",
    )

    parser.add_argument(
        "--dh-group",
        choices=[
            "modp2048",
            "modp3072",
            "modp4096",
            "ecp256",
            "ecp384",
        ],
        default="modp2048",
    )

    parser.add_argument(
        "--pfs",
        type=parse_bool,
        default=True,
    )

    parser.add_argument(
        "--ip-version",
        choices=["ipv4", "ipv6"],
        default="ipv4",
    )

    parser.add_argument(
        "--traffic-type",
        choices=[
            "voip",
            "whatsapp",
            "email",
            "web",
            "icmp",
            "video",
        ],
        default="voip",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
    )

    args = parser.parse_args()

    configuration = create_configuration(args)

    output = args.output
    output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with output.open("w", encoding="utf-8") as file:
        yaml.safe_dump(
            {"configuration": configuration},  # <--- Wraps it perfectly
            file,
            sort_keys=False,
        )

    print("Configuration created successfully.")
    print()
    print(f"Output: {output}")
    print()
    print("Configuration:")

    for key, value in configuration.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
