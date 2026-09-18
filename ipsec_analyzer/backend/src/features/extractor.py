from __future__ import annotations

from collections import defaultdict
from statistics import mean, pstdev

from src.pcap import Packet


FEATURE_NAMES = [
    "total_packets",
    "total_bytes",
    "capture_duration",
    "packets_per_second",
    "bytes_per_second",
    "mean_packet_size",
    "std_packet_size",
    "min_packet_size",
    "max_packet_size",
    "median_packet_size",
    "p25_packet_size",
    "p75_packet_size",
    "p90_packet_size",
    "p95_packet_size",
    "p99_packet_size",
    "mean_interarrival",
    "std_interarrival",
    "min_interarrival",
    "max_interarrival",
    "median_interarrival",
    "p25_interarrival",
    "p75_interarrival",
    "p90_interarrival",
    "p95_interarrival",
    "p99_interarrival",
    "forward_packets",
    "reverse_packets",
    "forward_bytes",
    "reverse_bytes",
    "forward_mean_packet_size",
    "reverse_mean_packet_size",
    "forward_std_packet_size",
    "reverse_std_packet_size",
    "forward_packet_ratio",
    "forward_byte_ratio",
    "tcp_packet_ratio",
    "udp_packet_ratio",
    "icmp_packet_ratio",
    "esp_packet_ratio",
    "tcp_udp_ratio",
    "flow_count",
    "bidirectional_flow_count",
    "unidirectional_flow_count",
    "mean_flow_duration",
    "std_flow_duration",
    "mean_packets_per_flow",
    "mean_bytes_per_flow",
    "mean_flow_packet_rate",
    "mean_flow_byte_rate",
    "burst_count",
    "mean_burst_size",
    "mean_burst_duration",
    "mean_idle_duration",
    "burstiness",
]


def extract(packets: list[Packet]) -> list[float]:
    if not packets:
        return [0.0] * len(FEATURE_NAMES)

    packets = sorted(packets, key=lambda packet: packet.timestamp)

    sizes = [packet.length for packet in packets]
    times = [packet.timestamp for packet in packets]

    total_packets = len(packets)
    total_bytes = sum(sizes)

    duration = times[-1] - times[0]
    if duration < 0:
        duration = 0.0

    interarrival = [
        current - previous
        for previous, current in zip(times, times[1:])
    ]

    forward, reverse = _split_directions(packets)
    flows = _build_flows(packets)

    flow_durations = [
        flow["end"] - flow["start"]
        for flow in flows.values()
    ]

    flow_packet_counts = [
        len(flow["packets"])
        for flow in flows.values()
    ]

    flow_byte_counts = [
        sum(packet.length for packet in flow["packets"])
        for flow in flows.values()
    ]

    flow_packet_rates = [
        _ratio(len(flow["packets"]), flow["end"] - flow["start"])
        for flow in flows.values()
    ]

    flow_byte_rates = [
        _ratio(
            sum(packet.length for packet in flow["packets"]),
            flow["end"] - flow["start"],
        )
        for flow in flows.values()
    ]

    bidirectional = sum(
        1 for flow in flows.values()
        if len(flow["directions"]) > 1
    )

    unidirectional = len(flows) - bidirectional

    tcp = sum(packet.protocol == "TCP" for packet in packets)
    udp = sum(packet.protocol == "UDP" for packet in packets)
    icmp = sum(
        packet.protocol in {"ICMP", "ICMPv6"}
        for packet in packets
    )
    esp = sum(packet.protocol == "ESP" for packet in packets)

    forward_sizes = [packet.length for packet in forward]
    reverse_sizes = [packet.length for packet in reverse]

    burst_sizes, burst_durations, idle_times = _burst_statistics(
        packets
    )

    return [
        float(total_packets),
        float(total_bytes),
        duration,
        _ratio(total_packets, duration),
        _ratio(total_bytes, duration),

        _mean(sizes),
        _std(sizes),
        float(min(sizes)),
        float(max(sizes)),
        _percentile(sizes, 50),
        _percentile(sizes, 25),
        _percentile(sizes, 75),
        _percentile(sizes, 90),
        _percentile(sizes, 95),
        _percentile(sizes, 99),

        _mean(interarrival),
        _std(interarrival),
        _minimum(interarrival),
        _maximum(interarrival),
        _percentile(interarrival, 50),
        _percentile(interarrival, 25),
        _percentile(interarrival, 75),
        _percentile(interarrival, 90),
        _percentile(interarrival, 95),
        _percentile(interarrival, 99),

        float(len(forward)),
        float(len(reverse)),
        float(sum(forward_sizes)),
        float(sum(reverse_sizes)),
        _mean(forward_sizes),
        _mean(reverse_sizes),
        _std(forward_sizes),
        _std(reverse_sizes),
        _ratio(len(forward), total_packets),
        _ratio(sum(forward_sizes), total_bytes),

        _ratio(tcp, total_packets),
        _ratio(udp, total_packets),
        _ratio(icmp, total_packets),
        _ratio(esp, total_packets),
        _ratio(tcp, udp),

        float(len(flows)),
        float(bidirectional),
        float(unidirectional),
        _mean(flow_durations),
        _std(flow_durations),
        _mean(flow_packet_counts),
        _mean(flow_byte_counts),
        _mean(flow_packet_rates),
        _mean(flow_byte_rates),

        float(len(burst_sizes)),
        _mean(burst_sizes),
        _mean(burst_durations),
        _mean(idle_times),
        _burstiness(interarrival),
    ]


def extract_dict(packets: list[Packet]) -> dict[str, float]:
    return dict(zip(FEATURE_NAMES, extract(packets)))


def _split_directions(
    packets: list[Packet],
) -> tuple[list[Packet], list[Packet]]:
    valid = [
        packet
        for packet in packets
        if packet.source is not None
        and packet.destination is not None
    ]

    if not valid:
        return [], []

    source = valid[0].source
    destination = valid[0].destination

    forward = []
    reverse = []

    for packet in packets:
        if (
            packet.source == source
            and packet.destination == destination
        ):
            forward.append(packet)

        elif (
            packet.source == destination
            and packet.destination == source
        ):
            reverse.append(packet)

    return forward, reverse


def _build_flows(packets: list[Packet]) -> dict:
    flows = defaultdict(
        lambda: {
            "packets": [],
            "start": None,
            "end": None,
            "directions": set(),
        }
    )

    for packet in packets:
        if packet.source is None or packet.destination is None:
            continue

        endpoint_a = (
            packet.source,
            packet.source_port,
        )
        endpoint_b = (
            packet.destination,
            packet.destination_port,
        )

        endpoints = tuple(sorted((endpoint_a, endpoint_b)))

        key = (
            endpoints[0],
            endpoints[1],
            packet.protocol,
        )

        flow = flows[key]

        flow["packets"].append(packet)

        if flow["start"] is None:
            flow["start"] = packet.timestamp

        flow["end"] = packet.timestamp

        flow["directions"].add(
            (packet.source, packet.destination)
        )

    return dict(flows)


def _burst_statistics(
    packets: list[Packet],
) -> tuple[list[int], list[float], list[float]]:
    if len(packets) < 2:
        return [], [], []

    intervals = [
        current.timestamp - previous.timestamp
        for previous, current in zip(packets, packets[1:])
    ]

    threshold = _percentile(intervals, 75)

    burst_sizes = []
    burst_durations = []
    idle_times = []

    current_size = 1
    burst_start = packets[0].timestamp

    for index, interval in enumerate(intervals):
        if interval <= threshold:
            current_size += 1
            continue

        if current_size > 1:
            burst_sizes.append(current_size)
            burst_durations.append(
                packets[index].timestamp - burst_start
            )

        idle_times.append(interval)

        current_size = 1
        burst_start = packets[index + 1].timestamp

    if current_size > 1:
        burst_sizes.append(current_size)
        burst_durations.append(
            packets[-1].timestamp - burst_start
        )

    return burst_sizes, burst_durations, idle_times


def _mean(values) -> float:
    return float(mean(values)) if values else 0.0


def _std(values) -> float:
    return float(pstdev(values)) if len(values) > 1 else 0.0


def _minimum(values) -> float:
    return float(min(values)) if values else 0.0


def _maximum(values) -> float:
    return float(max(values)) if values else 0.0


def _ratio(a: float, b: float) -> float:
    return float(a / b) if b else 0.0


def _percentile(values, percentile: float) -> float:
    if not values:
        return 0.0

    values = sorted(values)

    if len(values) == 1:
        return float(values[0])

    position = (len(values) - 1) * percentile / 100
    lower = int(position)
    upper = min(lower + 1, len(values))

    fraction = position - lower

    return float(
        values[lower]
        + (values[upper] - values[lower]) * fraction
    )


def _burstiness(interarrival) -> float:
    if not interarrival:
        return 0.0

    average = _mean(interarrival)

    if average == 0:
        return 0.0

    return _std(interarrival) / average