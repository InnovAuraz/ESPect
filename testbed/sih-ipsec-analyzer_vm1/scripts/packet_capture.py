import argparse

import json

import os

import time

from pathlib import Path



import yaml



from src.capture.validator import validate as validate_pcap

from src.controller import Controller

from src.experiment.validator import validate as validate_configuration





VM1 = "192.168.160.128"

VM2 = "192.168.160.129"



IPV6_VM1 = "fd00:160::128"

IPV6_VM2 = "fd00:160::129"



ROOT = Path(\_\_file\_\_).resolve().parents[1]

CAPTURE_INTERFACE = os.environ.get("ESPECT_CAPTURE_INTERFACE", "eth1")

STATUS_FILE = ROOT / "debug" / "logs" / "capture_status.json"

DEFAULT_OUTPUT_DIR = ROOT / "captures"





def write_status(\*\*values: object) -> None:

    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)

    payload: dict = {}

    if STATUS_FILE.is_file():

        try:

            payload = json.loads(STATUS_FILE.read_text(encoding="utf-8"))

        except (OSError, json.JSONDecodeError):

            payload = {}

    payload.update(values)

    payload.setdefault("started_at", time.time())

    payload["updated_at"] = time.time()

    try:

        STATUS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    except OSError:

        pass





def load_configuration(path: Path) -> dict:

    if not path.exists():

        raise FileNotFoundError(

            f"Configuration file not found: {path}"

        )



    with path.open("r", encoding="utf-8") as file:

        configuration = yaml.safe_load(file)



    if not isinstance(configuration, dict):

        raise ValueError(

            "Configuration YAML must contain a mapping."

        )



    if "configuration" in configuration:

        configuration = configuration["configuration"]



    errors = validate_configuration(configuration)



    if errors:

        raise ValueError(

            "Invalid IPsec configuration:\n"

            + "\n".join(

                f"- {error}" for error in errors

            )

        )



    return configuration





def get_addresses(ip_version: str) -> tuple[str, str]:

    if ip_version == "ipv4":

        return VM1, VM2



    if ip_version == "ipv6":

        return IPV6_VM1, IPV6_VM2



    raise ValueError(

        f"Unsupported IP version: {ip_version}"

    )





def build_capture_filter(ip_version: str) -> str:

    local, remote = get_addresses(ip_version)



    if ip_version == "ipv4":

        return (

            f"host {local} and host {remote} and "

            "(udp port 500 or udp port 4500 or ip proto 50)"

        )



    return (

        f"host {local} and host {remote} and "

        "(udp port 500 or udp port 4500 or ip6 proto 50)"

    )





def traffic_roles(

    traffic_type: str,

) -> tuple[str, str]:

    if traffic_type == "voip":

        return "peer", "peer"



    if traffic_type in {

        "icmp",

        "web",

        "email",

        "video",

        "whatsapp",

    }:

        return "sender", "receiver"



    raise ValueError(

        f"Unsupported traffic type: {traffic_type}"

    )





def run_capture(

    configuration: dict,

    duration: float,

    output: Path,

) -> None:

    ip_version = configuration["ip_version"]



    local_address, remote_address = get_addresses(

        ip_version

    )



    capture_filter = build_capture_filter(

        ip_version

    )



    role_a, role_b = traffic_roles(

        configuration["traffic_type"]

    )



    controller = Controller(

        VM1,

        VM2,

    )



    capture_started = False

    ipsec_started = False



    write_status(

        status="starting",

        stage="starting",

        duration=duration,

        traffic_type=configuration["traffic_type"],

        ipsec_mode=configuration["ipsec_mode"],

        ip_version=configuration["ip_version"],

        encryption=configuration["encryption"],

        integrity=configuration["integrity"],

        dh_group=configuration["dh_group"],

        pfs=configuration["pfs"],

        output=str(output),

        capture_interface=CAPTURE_INTERFACE,

        capture_filter=capture_filter,

    )



    try:

        # A previous run may have left an SA behind after an interrupted

        # browser session. Clear it before loading the next experiment.

        write_status(stage="cleanup", status="running")

        print("[0/6] Clearing any previous IPsec session...")

        try:

            controller.terminate_ipsec()

        except Exception:

            pass



        write_status(stage="configuring", status="running")

        print("[1/6] Configuring agents...")



        controller.configure(

            configuration,

            configuration,

        )



        write_status(stage="ipsec_configuring", status="running")

        print("[2/6] Applying IPsec configuration...")



        controller.apply_ipsec(

            configuration,

        )



        # Capture MUST begin before IKE negotiation.

        write_status(stage="capture_starting", status="running")

        print("[3/6] Starting tcpdump capture...")



        controller.start_capture(

            interface=CAPTURE_INTERFACE,

            filename=output.name,

            capture_filter=capture_filter,

        )

        capture_started = True



        write_status(stage="ipsec_starting", status="running")

        print("[4/6] Initiating IPsec...")



        controller.initiate_ipsec()

        ipsec_started = True



        write_status(stage="ipsec_verifying", status="running")

        print("[5/6] Checking IPsec status...")



        status_a = controller.ipsec_status(VM1)

        status_b = controller.ipsec_status(VM2)



        if "ESTABLISHED" not in status_a:

            raise RuntimeError(

                "VM1 IKE_SA was not established."

            )



        if "ESTABLISHED" not in status_b:

            raise RuntimeError(

                "VM2 IKE_SA was not established."

            )



        print("IPsec SA established on both agents.")



        write_status(stage="traffic_starting", status="running")

        print(

            f"Starting {configuration['traffic_type']} "

            f"traffic..."

        )



        controller.start_traffic(

            role_a,

            role_b,

            ipsec_mode=configuration["ipsec_mode"],

            ip_version=ip_version,

        )



        write_status(stage="capturing", status="running")

        print(

            f"Capturing for {duration:g} seconds..."

        )



        deadline = time.monotonic() + duration



        while True:

            remaining = deadline - time.monotonic()



            if remaining <= 0:

                break



            write_status(stage="capturing", status="running")

            time.sleep(

                min(0.25, remaining)

            )



        #controller.wait_for_traffic()

        write_status(stage="traffic_completed", status="running")



    except Exception as exc:

        write_status(stage="failed", status="failed", error=str(exc))

        raise



    finally:

        print("[6/6] Stopping capture...")



        if capture_started:

            controller.stop_capture()



        if ipsec_started:

            print("Terminating IPsec...")



            try:

                controller.terminate_ipsec()

            except Exception as exc:

                print(

                    "Warning: failed to terminate IPsec: "

                    f"{exc}"

                )



        if capture_started:

            controller.download_capture(output)



    print()

    print("Validating PCAP...")



    valid = validate_pcap(

        output,

        ip_version,

        local_address,

        remote_address,

    )



    if not valid:

        write_status(stage="validation_failed", status="failed", output=str(output))

        raise RuntimeError(

            "Generated PCAP failed validation."

        )



    packet_count = None

    try:

        from scapy.all import rdpcap

        packet_count = len(rdpcap(str(output)))

    except Exception:

        packet_count = None



    write_status(

        stage="completed",

        status="completed",

        output=str(output),

        output_size=output.stat().st_size if output.exists() else 0,

        packet_count=packet_count,

        validation="PASSED",

    )



    print()

    print("================================")

    print(" CAPTURE COMPLETED SUCCESSFULLY")

    print("================================")

    print(f"PCAP       : {output}")

    print(f"IP version : {ip_version}")

    print(f"Traffic    : {configuration['traffic_type']}")

    print(f"Mode       : {configuration['ipsec_mode']}")

    print(f"Duration   : {duration:g} seconds")

    print("Validation : PASSED")





def main() -> None:

    parser = argparse.ArgumentParser(

        description=(

            "Run a controlled IPsec experiment "

            "and generate a validated PCAP."

        )

    )



    parser.add_argument(

        "configuration",

        type=Path,

        help="Path to configuration.yaml",

    )



    parser.add_argument(

        "duration",

        type=float,

        help="Capture duration in seconds.",

    )



    parser.add_argument(

        "--output",

        type=Path,

        default=None,

        help="Output PCAP path.",

    )



    args = parser.parse_args()



    if args.duration <= 0:

        raise ValueError(

            "Duration must be greater than zero."

        )



    configuration = load_configuration(

        args.configuration

    )



    if args.output is None:

        DEFAULT_OUTPUT_DIR.mkdir(

            parents=True,

            exist_ok=True,

        )



        timestamp = time.strftime(

            "%Y%m%d\_%H%M%S"

        )



        output = (

            DEFAULT_OUTPUT_DIR

            / f"live\_{timestamp}.pcap"

        )



    else:

        output = args.output

        output.parent.mkdir(

            parents=True,

            exist_ok=True,

        )



    print()

    print("Configuration")

    print("-------------")



    for key, value in configuration.items():

        print(f"{key}: {value}")



    print()

    print(f"Duration: {args.duration:g}s")

    print(f"Output  : {output}")

    print()



    run_capture(

        configuration,

        args.duration,

        output,

    )





if \_\_name\_\_ == "\_\_main\_\_":

    main()
