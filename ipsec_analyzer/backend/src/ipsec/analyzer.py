from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from src.pcap import Packet


@dataclass(frozen=True)
class IPsecAnalysis:
    ip_version: str | None

    ike_detected: bool
    ike_version: str | None
    ike_exchange_types: tuple[str, ...]
    ike_encryption: str | None
    ike_integrity: str | None
    ike_prf: str | None
    ike_dh_group: str | None

    esp_detected: bool
    esp_packet_count: int
    esp_bytes: int
    esp_spis: tuple[int, ...]
    esp_sequence_numbers: tuple[int, ...]

    esp_encryption: str | None
    esp_integrity: str | None
    esp_pfs: bool | None

    source_addresses: tuple[str, ...]
    destination_addresses: tuple[str, ...]

    mode: str | None


def analyze(packets: Iterable[Packet]) -> IPsecAnalysis:
    packets = list(packets)

    ip_versions = set()
    sources = set()
    destinations = set()

    ike_packets = []
    esp_packets = []

    for packet in packets:
        if packet.source is not None:
            sources.add(packet.source)

            if ":" in packet.source:
                ip_versions.add("ipv6")
            else:
                ip_versions.add("ipv4")

        if packet.destination is not None:
            destinations.add(packet.destination)

        if packet.protocol == "ESP":
            esp_packets.append(packet)

        if (
            packet.protocol == "UDP"
            and packet.destination_port in {500, 4500}
        ):
            ike_packets.append(packet)

    ike_version = _ike_version(ike_packets)
    exchange_types = _exchange_types(ike_packets)

    (
        ike_encryption,
        ike_integrity,
        ike_prf,
        ike_dh_group,
    ) = _ike_proposal(ike_packets)

    (
        esp_encryption,
        esp_integrity,
        esp_pfs,
    ) = _esp_proposal(ike_packets)

    spis = []
    sequences = []

    for packet in esp_packets:
        spi, sequence = _esp_fields(packet)

        if spi is not None:
            spis.append(spi)

        if sequence is not None:
            sequences.append(sequence)

    return IPsecAnalysis(
        ip_version=_single(ip_versions),

        ike_detected=bool(ike_packets),
        ike_version=ike_version,
        ike_exchange_types=tuple(exchange_types),
        ike_encryption=ike_encryption,
        ike_integrity=ike_integrity,
        ike_prf=ike_prf,
        ike_dh_group=ike_dh_group,

        esp_detected=bool(esp_packets),
        esp_packet_count=len(esp_packets),
        esp_bytes=sum(packet.length for packet in esp_packets),
        esp_spis=tuple(sorted(set(spis))),
        esp_sequence_numbers=tuple(sequences),

        esp_encryption=esp_encryption,
        esp_integrity=esp_integrity,
        esp_pfs=esp_pfs,

        source_addresses=tuple(sorted(sources)),
        destination_addresses=tuple(sorted(destinations)),

        mode=_detect_mode(esp_packets),
    )


def _ike_version(packets: list[Packet]) -> str | None:
    for packet in packets:
        raw = packet.raw

        if raw.haslayer("IKEv2"):
            return "IKEv2"

        if raw.haslayer("IKEv1"):
            return "IKEv1"

    return None


def _exchange_types(packets: list[Packet]) -> list[str]:
    result = []

    for packet in packets:
        raw = packet.raw

        if not raw.haslayer("IKEv2"):
            continue

        ike = raw["IKEv2"]
        value = ike.exch_type

        if value == 34:
            name = "IKE_SA_INIT"
        elif value == 35:
            name = "IKE_AUTH"
        elif value == 36:
            name = "CREATE_CHILD_SA"
        elif value == 37:
            name = "INFORMATIONAL"
        else:
            name = str(value)

        if name not in result:
            result.append(name)

    return result


def _ike_proposal(
    packets: list[Packet],
) -> tuple[
    str | None,
    str | None,
    str | None,
    str | None,
]:
    """
    Extract the selected IKE proposal from an IKE_SA_INIT response.

    The response is the authoritative selected proposal.
    """

    responses = []

    for packet in packets:
        raw = packet.raw

        if not raw.haslayer("IKEv2"):
            continue

        ike = raw["IKEv2"]

        if ike.exch_type != 34:
            continue

        # IKEv2 Response flag.
        if not (int(ike.flags) & 0x20):
            continue

        responses.append(raw)

    for raw in responses:
        proposal = _find_proposal(raw, protocol=1)

        if proposal is None:
            continue

        transforms = _transforms(proposal)

        encryption = None
        integrity = None
        prf = None
        dh_group = None

        for transform in transforms:
            transform_type = _transform_type(transform)
            transform_id = _transform_id(transform)

            if transform_type == 1:
                encryption = _encryption_name(
                    transform_id,
                    getattr(transform, "key_length", None),
                )

            elif transform_type == 2:
                prf = _prf_name(transform_id)

            elif transform_type == 3:
                integrity = _integrity_name(transform_id)

            elif transform_type == 4:
                dh_group = _dh_name(transform_id)

        return encryption, integrity, prf, dh_group

    return None, None, None, None


def _esp_proposal(
    packets: list[Packet],
) -> tuple[str | None, str | None, bool | None]:
    """
    Extract an ESP proposal when it is actually visible.

    In normal IKEv2 operation the initial CHILD_SA proposal is carried
    inside encrypted IKE_AUTH, so this will commonly return unknown.
    """

    for packet in packets:
        raw = packet.raw

        if not raw.haslayer("IKEv2"):
            continue

        proposal = _find_proposal(raw, protocol=3)

        if proposal is None:
            continue

        encryption = None
        integrity = None
        pfs = None

        for transform in _transforms(proposal):
            transform_type = _transform_type(transform)
            transform_id = _transform_id(transform)

            if transform_type == 1:
                encryption = _encryption_name(
                    transform_id,
                    getattr(transform, "key_length", None),
                )

            elif transform_type == 3:
                integrity = _integrity_name(transform_id)

            elif transform_type == 4:
                pfs = True

        if pfs is None:
            pfs = False

        return encryption, integrity, pfs

    return None, None, None


def _find_proposal(packet, protocol: int):
    layer = packet.getlayer("IKEv2")

    if not layer:
        return None

    sa = layer.payload

    while sa:
        if sa.__class__.__name__ == "IKEv2_SA":
            proposal = getattr(sa, "prop", None)

            while proposal:
                if proposal.__class__.__name__ == "IKEv2_Proposal":
                    if getattr(proposal, "proto", None) == protocol:
                        return proposal

                proposal = getattr(proposal, "payload", None)

            return None

        sa = getattr(sa, "payload", None)

    return None


def _transforms(proposal) -> list:
    result = []

    transform = getattr(proposal, "trans", None)

    while transform is not None:
        name = transform.__class__.__name__

        if name != "IKEv2_Transform":
            break

        result.append(transform)
        transform = getattr(transform, "payload", None)

    return result


def _transform_type(transform) -> int | None:
    value = getattr(transform, "transform_type", None)

    if isinstance(value, int):
        return value

    mapping = {
        "Encryption": 1,
        "PRF": 2,
        "Integrity": 3,
        "GroupDesc": 4,
    }

    return mapping.get(str(value))


def _transform_id(transform):
    return getattr(transform, "transform_id", None)


def _encryption_name(transform_id, key_length) -> str | None:
    if transform_id is None:
        return None

    # transform_id is always the raw numeric IANA "Transform ID"
    # (e.g. 12 for AES-CBC) - scapy never hands back a symbolic
    # name via plain attribute access, even when the packet was
    # originally constructed with a string like "AES-CBC".

    if transform_id == 12:  # AES-CBC
        bits = _key_bits(key_length)

        if bits == 128:
            return "aes128-cbc"

        if bits == 192:
            return "aes192-cbc"

        if bits == 256:
            return "aes256-cbc"

        return "aes-cbc"

    if transform_id == 20:  # AES-GCM, 16 octet ICV
        bits = _key_bits(key_length)

        if bits == 128:
            return "aes128-gcm16"

        if bits == 256:
            return "aes256-gcm16"

        return "aes-gcm16"

    mapping = {
        13: "aes-ctr",
        3: "3des",
        11: "null",
        28: "chacha20-poly1305",
    }

    return mapping.get(transform_id, str(transform_id))


def _integrity_name(transform_id) -> str | None:
    if transform_id is None:
        return None

    mapping = {
        2: "sha1",
        12: "sha256",
        13: "sha384",
        14: "sha512",
        5: "aes-xcbc",
        8: "aes-cmac",
        0: "none-aead",
    }

    return mapping.get(transform_id, str(transform_id))


def _prf_name(transform_id) -> str | None:
    if transform_id is None:
        return None

    mapping = {
        2: "sha1",
        5: "sha256",
        6: "sha384",
        7: "sha512",
        8: "aes128-cmac",
        4: "aes128-xcbc",
    }

    return mapping.get(transform_id, str(transform_id))


def _dh_name(transform_id) -> str | None:
    if transform_id is None:
        return None

    mapping = {
        14: "modp2048",
        15: "modp3072",
        16: "modp4096",
        19: "ecp256",
        20: "ecp384",
    }

    return mapping.get(transform_id, str(transform_id))


def _key_bits(value) -> int | None:
    if value is None:
        return None

    try:
        value = int(value)
    except (TypeError, ValueError):
        return None

    if value in {128, 192, 256}:
        return value

    return None


def _esp_fields(packet: Packet) -> tuple[int | None, int | None]:
    raw = packet.raw

    if not raw.haslayer("ESP"):
        return None, None

    esp = raw["ESP"]

    return (
        getattr(esp, "spi", None),
        getattr(esp, "seq", None),
    )


def _detect_mode(esp_packets: list[Packet]) -> str | None:
    if not esp_packets:
        return None

    for packet in esp_packets:
        raw = packet.raw
        esp = raw.getlayer("ESP")

        if esp is None:
            continue

        payload = getattr(esp, "payload", None)

        if payload is None:
            continue

        if payload.haslayer("IP") or payload.haslayer("IPv6"):
            return "tunnel"

    return "transport"


def _single(values: set[str]) -> str | None:
    if len(values) == 1:
        return next(iter(values))

    if not values:
        return None

    return "mixed"