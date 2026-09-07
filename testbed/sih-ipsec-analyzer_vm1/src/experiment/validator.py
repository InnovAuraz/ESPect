AEAD_ENCRYPTION = {
    "aes128-gcm16",
    "aes256-gcm16",
}

NON_AEAD_ENCRYPTION = {
    "aes128-cbc",
    "aes256-cbc",
}

VALID_INTEGRITY = {
    "sha256",
    "sha384",
    "sha512",
    "none-aead",
}

VALID_DH_GROUPS = {
    "modp2048",
    "modp3072",
    "modp4096",
    "ecp256",
    "ecp384",
}

VALID_IPSEC_MODES = {
    "transport",
    "tunnel",
}

VALID_IP_VERSIONS = {
    "ipv4",
    "ipv6",
}

VALID_TRAFFIC_TYPES = {
    "voip",
    "whatsapp",
    "email",
    "web",
    "icmp",
    "video",
}


def validate(configuration: dict) -> list[str]:
    errors = []

    required = {
        "ipsec_mode",
        "encryption",
        "integrity",
        "dh_group",
        "pfs",
        "ip_version",
        "traffic_type",
    }

    missing = required - configuration.keys()

    for name in sorted(missing):
        errors.append(f"Missing parameter: {name}")

    if errors:
        return errors

    encryption = configuration["encryption"]
    integrity = configuration["integrity"]
    dh_group = configuration["dh_group"]
    ipsec_mode = configuration["ipsec_mode"]
    ip_version = configuration["ip_version"]
    traffic_type = configuration["traffic_type"]
    pfs = configuration["pfs"]

    if encryption not in AEAD_ENCRYPTION | NON_AEAD_ENCRYPTION:
        errors.append(
            f"Unsupported encryption: {encryption}"
        )

    if integrity not in VALID_INTEGRITY:
        errors.append(
            f"Unsupported integrity: {integrity}"
        )

    if encryption in AEAD_ENCRYPTION:
        if integrity != "none-aead":
            errors.append(
                f"{encryption} requires integrity=none-aead"
            )

    elif encryption in NON_AEAD_ENCRYPTION:
        if integrity == "none-aead":
            errors.append(
                f"{encryption} cannot use integrity=none-aead"
            )

    if dh_group not in VALID_DH_GROUPS:
        errors.append(
            f"Unsupported DH group: {dh_group}"
        )

    if not isinstance(pfs, bool):
        errors.append(
            "PFS must be a boolean"
        )

    if ipsec_mode not in VALID_IPSEC_MODES:
        errors.append(
            f"Unsupported IPsec mode: {ipsec_mode}"
        )

    if ip_version not in VALID_IP_VERSIONS:
        errors.append(
            f"Unsupported IP version: {ip_version}"
        )

    if traffic_type not in VALID_TRAFFIC_TYPES:
        errors.append(
            f"Unsupported traffic type: {traffic_type}"
        )

    return errors