import subprocess
from pathlib import Path


class IPsecConfigError(ValueError):
    pass


ENCRYPTION_MAP = {
    "aes128-cbc": "aes128",
    "aes256-cbc": "aes256",
    "aes128-gcm16": "aes128gcm16",
    "aes256-gcm16": "aes256gcm16",
}


CLASSIC_ENCRYPTIONS = {
    "aes128-cbc",
    "aes256-cbc",
}

AEAD_ENCRYPTIONS = {
    "aes128-gcm16",
    "aes256-gcm16",
}


VALID_MODES = {
    "transport",
    "tunnel",
}


def _selector(address: str, ip_version: str) -> str:
    if ip_version == "ipv4":
        return f"{address}/32"

    if ip_version == "ipv6":
        return f"{address}/128"

    raise IPsecConfigError(
        f"Unsupported IP version: {ip_version}"
    )


def build(
    configuration: dict,
    local_address: str,
    remote_address: str,
    local_inner_address: str | None = None,
    remote_inner_address: str | None = None,
) -> str:
    required = {
        "ipsec_mode",
        "encryption",
        "integrity",
        "dh_group",
        "pfs",
        "ip_version",
    }

    missing = required - configuration.keys()

    if missing:
        raise IPsecConfigError(
            f"Missing configuration values: {sorted(missing)}"
        )

    ipsec_mode = configuration["ipsec_mode"]
    encryption = configuration["encryption"]
    integrity = configuration["integrity"]
    dh_group = configuration["dh_group"]
    ip_version = configuration["ip_version"]

    if ipsec_mode not in VALID_MODES:
        raise IPsecConfigError(
            f"Unsupported IPsec mode: {ipsec_mode}"
        )

    if encryption not in ENCRYPTION_MAP:
        raise IPsecConfigError(
            f"Unsupported encryption: {encryption}"
        )

    if ipsec_mode == "transport":
        local_ts = _selector(
            local_address,
            ip_version,
        )

        remote_ts = _selector(
            remote_address,
            ip_version,
        )

    else:
        if local_inner_address is None:
            raise IPsecConfigError(
                "Tunnel mode requires local_inner_address"
            )

        if remote_inner_address is None:
            raise IPsecConfigError(
                "Tunnel mode requires remote_inner_address"
            )

        local_ts = _selector(
            local_inner_address,
            ip_version,
        )

        remote_ts = _selector(
            remote_inner_address,
            ip_version,
        )

    strongswan_encryption = ENCRYPTION_MAP[encryption]

    if encryption in CLASSIC_ENCRYPTIONS:
        ike_proposal = (
            f"{strongswan_encryption}-"
            f"{integrity}-"
            f"{dh_group}"
        )

        esp_proposal = (
            f"{strongswan_encryption}-"
            f"{integrity}"
        )

    elif encryption in AEAD_ENCRYPTIONS:
        ike_proposal = (
            f"{strongswan_encryption}-"
            f"prfsha256-"
            f"{dh_group}"
        )

        esp_proposal = strongswan_encryption

    else:
        raise IPsecConfigError(
            f"Unsupported encryption: {encryption}"
        )

    if configuration["pfs"]:
        esp_proposal = (
            f"{esp_proposal}-"
            f"{dh_group}"
        )

    return f"""connections {{
    learning-vpn {{
        version = 2
        local_addrs = {local_address}
        remote_addrs = {remote_address}

        proposals = {ike_proposal}

        local {{
            auth = psk
            id = {local_address}
        }}

        remote {{
            auth = psk
            id = {remote_address}
        }}

        children {{
            learning-child {{
                mode = {ipsec_mode}
                priority = 1000
                local_ts = {local_ts}
                remote_ts = {remote_ts}
                esp_proposals = {esp_proposal}
                start_action = none
            }}
        }}
    }}
}}

secrets {{
    ike-psk {{
        secret = "LearningIPsec-2026"
    }}
}}
"""


def write(
    path: str | Path,
    configuration: dict,
    local_address: str,
    remote_address: str,
    local_inner_address: str | None = None,
    remote_inner_address: str | None = None,
) -> None:
    path = Path(path)
    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_text(
        build(
            configuration,
            local_address,
            remote_address,
            local_inner_address,
            remote_inner_address,
        ),
        encoding="utf-8",
    )


def apply(config_text: str) -> None:
    temporary_path = Path("/tmp/learning.conf")

    temporary_path.write_text(
        config_text,
        encoding="utf-8",
    )

    try:
        subprocess.run(
            [
                "sudo",
                "cp",
                str(temporary_path),
                "/etc/swanctl/conf.d/learning.conf",
            ],
            check=True,
        )

        subprocess.run(
            [
                "sudo",
                "swanctl",
                "--load-conns",
            ],
            check=True,
        )

        subprocess.run(
            [
                "sudo",
                "swanctl",
                "--load-creds",
            ],
            check=True,
        )

    except subprocess.CalledProcessError as exc:
        raise IPsecConfigError(
            "Failed to apply IPsec configuration"
        ) from exc


def initiate(child: str = "learning-child") -> None:
    try:
        subprocess.run(
            [
                "sudo",
                "swanctl",
                "--initiate",
                "--child",
                child,
            ],
            check=True,
        )

    except subprocess.CalledProcessError as exc:
        raise IPsecConfigError(
            f"Failed to initiate IPsec child: {child}"
        ) from exc


def terminate(ike: str = "learning-vpn") -> None:
    try:
        subprocess.run(
            [
                "sudo",
                "swanctl",
                "--terminate",
                "--ike",
                ike,
            ],
            check=True,
        )

    except subprocess.CalledProcessError as exc:
        raise IPsecConfigError(
            f"Failed to terminate IPsec IKE_SA: {ike}"
        ) from exc


def status() -> str:
    try:
        result = subprocess.run(
            [
                "sudo",
                "swanctl",
                "--list-sas",
            ],
            check=True,
            capture_output=True,
            text=True,
        )

    except subprocess.CalledProcessError as exc:
        raise IPsecConfigError(
            "Failed to read IPsec SA status"
        ) from exc

    return result.stdout