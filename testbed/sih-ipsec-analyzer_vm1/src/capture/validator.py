from pathlib import Path

from scapy.all import ESP, IP, IPv6, UDP, rdpcap


class CaptureValidationError(RuntimeError):
    pass


def validate(
    pcap: str | Path,
    ip_version: str,
    local_address: str,
    remote_address: str,
) -> bool:
    pcap = Path(pcap)

    if not pcap.is_file():
        raise CaptureValidationError(
            f"PCAP file does not exist: {pcap}"
        )

    if ip_version not in {"ipv4", "ipv6"}:
        raise CaptureValidationError(
            f"Unsupported IP version: {ip_version}"
        )

    try:
        packets = rdpcap(str(pcap))
    except Exception as exc:
        raise CaptureValidationError(
            f"Failed to read PCAP: {pcap}"
        ) from exc

    if len(packets) == 0:
        return False

    if not _contains_ip_version(packets, ip_version):
        return False

    if not _contains_ike(packets):
        return False

    if not _contains_esp(packets):
        return False

    if not _contains_direction(
        packets,
        ip_version,
        local_address,
        remote_address,
    ):
        return False

    if not _contains_direction(
        packets,
        ip_version,
        remote_address,
        local_address,
    ):
        return False

    return True


def _contains_ip_version(packets, ip_version: str) -> bool:
    if ip_version == "ipv4":
        return any(packet.haslayer(IP) for packet in packets)

    return any(packet.haslayer(IPv6) for packet in packets)


def _contains_ike(packets) -> bool:
    for packet in packets:
        if not packet.haslayer(UDP):
            continue

        udp = packet[UDP]

        if udp.sport in {500, 4500}:
            return True

        if udp.dport in {500, 4500}:
            return True

    return False


def _contains_esp(packets) -> bool:
    return any(packet.haslayer(ESP) for packet in packets)


def _contains_direction(
    packets,
    ip_version: str,
    source: str,
    destination: str,
) -> bool:
    for packet in packets:
        if ip_version == "ipv4":
            if not packet.haslayer(IP):
                continue

            ip = packet[IP]

        else:
            if not packet.haslayer(IPv6):
                continue

            ip = packet[IPv6]

        if ip.src == source and ip.dst == destination:
            return True

    return False